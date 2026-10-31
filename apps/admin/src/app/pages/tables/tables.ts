import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import {
  RestaurantTable,
  TablesApi,
  Zone,
} from '@cafeqr/api-client';
import { PERMISSIONS } from '@cafeqr/shared';

@Component({
  selector: 'app-tables-page',
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './tables.html',
})
export class TablesPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tablesApi = inject(TablesApi);
  private readonly auth = inject(AuthService);

  readonly canManage = computed(() =>
    this.auth.hasPermission(PERMISSIONS.MESA_GESTIONAR),
  );

  readonly zones = signal<Zone[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly zoneFormOpen = signal(false);
  readonly editingZone = signal<Zone | null>(null);
  readonly savingZone = signal(false);
  readonly zoneError = signal<string | null>(null);

  readonly tableFormOpen = signal(false);
  readonly editingTable = signal<RestaurantTable | null>(null);
  readonly savingTable = signal(false);
  readonly tableError = signal<string | null>(null);

  readonly qrOpen = signal(false);
  readonly qrTable = signal<RestaurantTable | null>(null);
  readonly qrUrl = signal<string | null>(null);
  readonly qrImageUrl = signal<string | null>(null);
  readonly qrLoading = signal(false);
  readonly qrError = signal<string | null>(null);

  readonly zoneForm = this.fb.nonNullable.group({
    nombre: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],
    activo: [true],
  });

  readonly tableForm = this.fb.nonNullable.group({
    zonaId: ['', [Validators.required]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    capacidad: [4, [Validators.required, Validators.min(1), Validators.max(50)]],
    estado: ['libre' as RestaurantTable['estado'], [Validators.required]],
    activo: [true],
  });

  readonly totalTables = computed(() =>
    this.zones().reduce((sum, zone) => sum + (zone.mesas?.length ?? 0), 0),
  );

  readonly freeTables = computed(() =>
    this.zones().reduce(
      (sum, zone) =>
        sum +
        (zone.mesas ?? []).filter((table) => table.estado === 'libre').length,
      0,
    ),
  );

  readonly occupiedTables = computed(() =>
    this.zones().reduce(
      (sum, zone) =>
        sum +
        (zone.mesas ?? []).filter((table) => table.estado === 'ocupada')
          .length,
      0,
    ),
  );

  readonly tableStates: Array<{
    value: RestaurantTable['estado'];
    label: string;
  }> = [
    { value: 'libre', label: 'Libre' },
    { value: 'ocupada', label: 'Ocupada' },
    { value: 'reservada', label: 'Reservada' },
    { value: 'inactiva', label: 'Inactiva' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.tablesApi.listZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las mesas y zonas.');
        this.loading.set(false);
      },
    });
  }

  openCreateZone(): void {
    this.editingZone.set(null);
    this.zoneForm.reset({ nombre: '', activo: true });
    this.zoneError.set(null);
    this.zoneFormOpen.set(true);
  }

  openEditZone(zone: Zone): void {
    this.editingZone.set(zone);
    this.zoneForm.reset({ nombre: zone.nombre, activo: zone.activo });
    this.zoneError.set(null);
    this.zoneFormOpen.set(true);
  }

  closeZoneForm(): void {
    if (!this.savingZone()) {
      this.zoneFormOpen.set(false);
      this.zoneError.set(null);
    }
  }

  saveZone(): void {
    if (this.savingZone()) {
      return;
    }

    if (this.zoneForm.invalid) {
      this.zoneForm.markAllAsTouched();
      return;
    }

    const value = this.zoneForm.getRawValue();
    this.savingZone.set(true);
    this.zoneError.set(null);

    const editing = this.editingZone();
    const request = editing
      ? this.tablesApi.updateZone(editing.id, {
          nombre: value.nombre.trim(),
          activo: value.activo,
        })
      : this.tablesApi.createZone({
          nombre: value.nombre.trim(),
          activo: value.activo,
        });

    request.subscribe({
      next: (zone) => {
        this.savingZone.set(false);
        this.zoneFormOpen.set(false);
        this.success.set(
          editing
            ? `Zona “${zone.nombre}” actualizada.`
            : `Zona “${zone.nombre}” creada.`,
        );
        this.load();
      },
      error: (error) => {
        this.zoneError.set(
          this.message(error, 'No se pudo guardar la zona.'),
        );
        this.savingZone.set(false);
      },
    });
  }

  openCreateTable(zoneId?: string): void {
    this.editingTable.set(null);
    this.tableForm.reset({
      zonaId: zoneId ?? this.zones()[0]?.id ?? '',
      numero: '',
      capacidad: 4,
      estado: 'libre',
      activo: true,
    });
    this.tableError.set(null);
    this.tableFormOpen.set(true);
  }

  openEditTable(table: RestaurantTable): void {
    this.editingTable.set(table);
    this.tableForm.reset({
      zonaId: table.zona.id,
      numero: table.numero,
      capacidad: table.capacidad,
      estado: table.estado,
      activo: table.activo,
    });
    this.tableError.set(null);
    this.tableFormOpen.set(true);
  }

  closeTableForm(): void {
    if (!this.savingTable()) {
      this.tableFormOpen.set(false);
      this.tableError.set(null);
    }
  }

  saveTable(): void {
    if (this.savingTable()) {
      return;
    }

    if (this.tableForm.invalid) {
      this.tableForm.markAllAsTouched();
      return;
    }

    const value = this.tableForm.getRawValue();
    this.savingTable.set(true);
    this.tableError.set(null);

    const editing = this.editingTable();
    const payload = {
      zonaId: value.zonaId,
      numero: value.numero.trim(),
      capacidad: Number(value.capacidad),
      estado: value.estado,
      activo: value.activo,
    };
    const request = editing
      ? this.tablesApi.updateTable(editing.id, payload)
      : this.tablesApi.createTable(payload);

    request.subscribe({
      next: (table) => {
        this.savingTable.set(false);
        this.tableFormOpen.set(false);
        this.success.set(
          editing
            ? `Mesa ${table.numero} actualizada.`
            : `Mesa ${table.numero} creada.`,
        );
        this.load();
      },
      error: (error) => {
        this.tableError.set(
          this.message(error, 'No se pudo guardar la mesa.'),
        );
        this.savingTable.set(false);
      },
    });
  }

  openQr(table: RestaurantTable): void {
    this.qrTable.set(table);
    this.qrOpen.set(true);
    this.qrLoading.set(true);
    this.qrError.set(null);
    this.clearQrImage();

    this.tablesApi.getQr(table.id).subscribe({
      next: (qr) => this.qrUrl.set(qr.url),
      error: () => this.qrError.set('No se pudo obtener el enlace del QR.'),
    });

    this.tablesApi.getQrPng(table.id).subscribe({
      next: (download) => {
        this.clearQrImage();
        this.qrImageUrl.set(URL.createObjectURL(download.blob));
        this.qrLoading.set(false);
      },
      error: () => {
        this.qrError.set('No se pudo generar la imagen del QR.');
        this.qrLoading.set(false);
      },
    });
  }

  closeQr(): void {
    this.qrOpen.set(false);
    this.qrTable.set(null);
    this.qrUrl.set(null);
    this.qrError.set(null);
    this.clearQrImage();
  }

  downloadQr(): void {
    const table = this.qrTable();

    if (!table) {
      return;
    }

    this.tablesApi.getQrPng(table.id).subscribe({
      next: (download) => this.download(download.blob, download.filename),
      error: () => this.qrError.set('No se pudo descargar el QR.'),
    });
  }

  copyQrLink(): void {
    const url = this.qrUrl();

    if (!url) {
      return;
    }

    void navigator.clipboard.writeText(url).then(
      () => this.success.set('Enlace del menú copiado.'),
      () => this.qrError.set('No se pudo copiar el enlace.'),
    );
  }

  regenerateQr(table: RestaurantTable): void {
    if (
      !window.confirm(
        `¿Regenerar el QR de la mesa ${table.numero}? El código anterior dejará de funcionar.`,
      )
    ) {
      return;
    }

    this.tablesApi.regenerateQr(table.id).subscribe({
      next: (updated) => {
        this.success.set(`QR de la mesa ${updated.numero} regenerado.`);
        this.load();
      },
      error: (error) => {
        this.error.set(
          this.message(error, 'No se pudo regenerar el QR.'),
        );
      },
    });
  }

  stateClass(estado: string): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ';

    if (estado === 'libre') {
      return base + 'bg-lettuce/10 text-lettuce';
    }

    if (estado === 'ocupada') {
      return base + 'bg-mustard-100 text-mustard-800';
    }

    if (estado === 'reservada') {
      return base + 'bg-brand-50 text-brand-700';
    }

    return base + 'bg-stone-100 text-stone-500';
  }

  stateLabel(estado: string): string {
    return (
      this.tableStates.find((state) => state.value === estado)?.label ?? estado
    );
  }

  private clearQrImage(): void {
    const current = this.qrImageUrl();

    if (current) {
      URL.revokeObjectURL(current);
      this.qrImageUrl.set(null);
    }
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
