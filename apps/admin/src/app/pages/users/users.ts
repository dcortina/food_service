import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import {
  Branch,
  Role,
  UpdateUserPayload,
  User,
  UsersApi,
} from '@cafeqr/api-client';
import { PERMISSIONS, ROLE_LABELS, RoleName } from '@cafeqr/shared';
import { forkJoin } from 'rxjs';

type UserFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-users-page',
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './users.html',
})
export class UsersPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(UsersApi);
  private readonly auth = inject(AuthService);

  readonly canManage = computed(() =>
    this.auth.hasPermission(PERMISSIONS.USUARIO_GESTIONAR),
  );

  readonly users = signal<User[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly search = signal('');
  readonly filter = signal<UserFilter>('all');
  readonly toggling = signal<Set<string>>(new Set());

  readonly formOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly userForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    pin: ['', [Validators.pattern(/^\d{4,8}$/)]],
    telefono: [''],
    rolId: ['', [Validators.required]],
    sucursalId: ['', [Validators.required]],
    activo: [true],
  });

  readonly filteredUsers = computed(() => {
    const query = this.search().trim().toLowerCase();
    const filter = this.filter();

    return this.users().filter((user) => {
      const matchesQuery =
        !query ||
        user.nombre.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        (user.telefono ?? '').toLowerCase().includes(query);
      const matchesState =
        filter === 'all' ||
        (filter === 'active' && user.activo) ||
        (filter === 'inactive' && !user.activo);

      return matchesQuery && matchesState;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      users: this.usersApi.list({ pageSize: 100 }),
      roles: this.usersApi.listRoles(),
      branches: this.usersApi.listBranches(),
    }).subscribe({
      next: ({ users, roles, branches }) => {
        this.users.set(users.data);
        this.roles.set(roles);
        this.branches.set(branches);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setFilter(filter: UserFilter): void {
    this.filter.set(filter);
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.userForm.controls.password.setValidators([
      Validators.required,
      Validators.minLength(8),
    ]);
    this.userForm.controls.password.updateValueAndValidity();
    this.userForm.reset({
      nombre: '',
      username: '',
      password: '',
      pin: '',
      telefono: '',
      rolId: this.roles()[0]?.id ?? '',
      sucursalId: this.branches()[0]?.id ?? '',
      activo: true,
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  openEdit(user: User): void {
    this.editingUser.set(user);
    this.userForm.controls.password.setValidators([
      Validators.minLength(8),
    ]);
    this.userForm.controls.password.updateValueAndValidity();
    this.userForm.reset({
      nombre: user.nombre,
      username: user.username,
      password: '',
      pin: '',
      telefono: user.telefono ?? '',
      rolId: user.rol.id,
      sucursalId: user.sucursal?.id ?? this.branches()[0]?.id ?? '',
      activo: user.activo,
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
      this.formError.set(null);
    }
  }

  saveUser(): void {
    if (this.saving()) {
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();
    this.saving.set(true);
    this.formError.set(null);

    const editing = this.editingUser();
    const base = {
      nombre: value.nombre.trim(),
      username: value.username.trim(),
      ...(value.telefono.trim() ? { telefono: value.telefono.trim() } : {}),
      rolId: value.rolId,
      sucursalId: value.sucursalId,
      ...(value.pin.trim() ? { pin: value.pin.trim() } : {}),
    };

    const request = editing
      ? this.usersApi.update(editing.id, {
          ...base,
          ...(value.password.trim()
            ? { password: value.password.trim() }
            : {}),
          activo: value.activo,
        } satisfies UpdateUserPayload)
      : this.usersApi.create({
          ...base,
          password: value.password.trim(),
        });

    request.subscribe({
      next: (user) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.success.set(
          editing
            ? `Usuario “${user.nombre}” actualizado.`
            : `Usuario “${user.nombre}” creado.`,
        );
        this.load();
      },
      error: (error) => {
        this.formError.set(
          this.message(error, 'No se pudo guardar el usuario.'),
        );
        this.saving.set(false);
      },
    });
  }

  toggleActive(user: User): void {
    if (!this.canManage() || this.toggling().has(user.id)) {
      return;
    }

    this.toggling.update((current) => new Set(current).add(user.id));

    this.usersApi.update(user.id, { activo: !user.activo }).subscribe({
      next: (updated) => {
        this.users.update((users) =>
          users.map((current) =>
            current.id === updated.id ? updated : current,
          ),
        );
        this.toggling.update((current) => {
          const next = new Set(current);
          next.delete(user.id);
          return next;
        });
        this.success.set(
          `Usuario “${updated.nombre}” ${updated.activo ? 'activado' : 'desactivado'}.`,
        );
      },
      error: (error) => {
        this.toggling.update((current) => {
          const next = new Set(current);
          next.delete(user.id);
          return next;
        });
        this.error.set(
          this.message(error, 'No se pudo cambiar el estado del usuario.'),
        );
      },
    });
  }

  roleLabel(user: User): string {
    return ROLE_LABELS[user.rol.nombre as RoleName] ?? user.rol.nombre;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'Nunca';
    }

    return new Intl.DateTimeFormat('es-CU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private message(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return typeof message === 'string' && message ? message : fallback;
  }
}
