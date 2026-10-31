import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import {
  CatalogApi,
  Category,
  CreateProductPayload,
  Currency,
  ModifierGroup,
  Product,
} from '@cafeqr/api-client';
import { PERMISSIONS } from '@cafeqr/shared';
import { forkJoin } from 'rxjs';

type CatalogTab = 'products' | 'categories' | 'modifiers';

@Component({
  selector: 'app-catalog-page',
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './catalog.html',
})
export class CatalogPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogApi = inject(CatalogApi);
  private readonly auth = inject(AuthService);

  readonly canManage = computed(() =>
    this.auth.hasPermission(PERMISSIONS.CATALOGO_GESTIONAR),
  );

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly groups = signal<ModifierGroup[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly activeTab = signal<CatalogTab>('products');
  readonly search = signal('');
  readonly categoryFilter = signal<string | null>(null);

  readonly productFormOpen = signal(false);
  readonly editingProduct = signal<Product | null>(null);
  readonly savingProduct = signal(false);
  readonly productError = signal<string | null>(null);
  readonly selectedGroupIds = signal<string[]>([]);

  readonly categoryFormOpen = signal(false);
  readonly editingCategory = signal<Category | null>(null);
  readonly savingCategory = signal(false);
  readonly categoryError = signal<string | null>(null);
  readonly toggling = signal<Set<string>>(new Set());

  readonly modifierFormOpen = signal(false);
  readonly savingModifier = signal(false);
  readonly modifierError = signal<string | null>(null);

  readonly productForm = this.fb.nonNullable.group({
    categoriaId: ['', [Validators.required]],
    nombre: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],
    descripcion: [''],
    precio: [
      '',
      [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    ],
    monedaId: ['', [Validators.required]],
    tiempoPreparacionMin: [
      5,
      [Validators.required, Validators.min(1)],
    ],
    imagenUrl: [''],
    disponible: [true],
  });

  readonly categoryForm = this.fb.nonNullable.group({
    nombre: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],
    orden: [0, [Validators.required, Validators.min(0)]],
    activo: [true],
  });

  readonly modifierForm = this.fb.nonNullable.group({
    nombre: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],
    tipo: ['unico' as 'unico' | 'multiple'],
    minSeleccion: [0, [Validators.required, Validators.min(0)]],
    maxSeleccion: [1, [Validators.required, Validators.min(1)]],
    obligatorio: [false],
    orden: [0, [Validators.required, Validators.min(0)]],
    activo: [true],
    modificadores: this.fb.array([this.createModifierRow()]),
  });

  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const categoryId = this.categoryFilter();

    return this.products().filter((product) => {
      const matchesCategory =
        !categoryId || product.categoriaId === categoryId;
      const matchesQuery =
        !query ||
        product.nombre.toLowerCase().includes(query) ||
        (product.descripcion ?? '').toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  });

  readonly availableCount = computed(
    () => this.products().filter((product) => product.disponible).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      categories: this.catalogApi.listCategories(),
      products: this.catalogApi.listProducts({
        pageSize: 100,
        disponible: 'all',
      }),
      groups: this.catalogApi.listModifierGroups(),
      currencies: this.catalogApi.listCurrencies(),
    }).subscribe({
      next: ({ categories, products, groups, currencies }) => {
        this.categories.set(categories);
        this.products.set(products.data);
        this.groups.set(groups);
        this.currencies.set(currencies);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: CatalogTab): void {
    this.activeTab.set(tab);
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  selectCategory(id: string | null): void {
    this.categoryFilter.set(id);
  }

  openCreateProduct(): void {
    this.editingProduct.set(null);
    this.productForm.reset({
      categoriaId: this.categories()[0]?.id ?? '',
      nombre: '',
      descripcion: '',
      precio: '',
      monedaId: this.currencies()[0]?.id ?? '',
      tiempoPreparacionMin: 5,
      imagenUrl: '',
      disponible: true,
    });
    this.selectedGroupIds.set([]);
    this.productError.set(null);
    this.productFormOpen.set(true);
  }

  openEditProduct(product: Product): void {
    const price = product.precios[0];

    this.editingProduct.set(product);
    this.productForm.reset({
      categoriaId: product.categoriaId,
      nombre: product.nombre,
      descripcion: product.descripcion ?? '',
      precio: price?.precio ?? '',
      monedaId: price?.monedaId ?? this.currencies()[0]?.id ?? '',
      tiempoPreparacionMin: product.tiempoPreparacionMin ?? 5,
      imagenUrl: product.imagenUrl ?? '',
      disponible: product.disponible,
    });
    this.selectedGroupIds.set(
      product.gruposModificadores.map((group) => group.id),
    );
    this.productError.set(null);
    this.productFormOpen.set(true);
  }

  closeProductForm(): void {
    if (!this.savingProduct()) {
      this.productFormOpen.set(false);
      this.productError.set(null);
    }
  }

  toggleGroup(groupId: string): void {
    this.selectedGroupIds.update((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  saveProduct(): void {
    if (this.savingProduct()) {
      return;
    }

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const value = this.productForm.getRawValue();
    const payload: CreateProductPayload = {
      categoriaId: value.categoriaId,
      nombre: value.nombre.trim(),
      ...(value.descripcion.trim()
        ? { descripcion: value.descripcion.trim() }
        : {}),
      ...(value.imagenUrl.trim()
        ? { imagenUrl: value.imagenUrl.trim() }
        : {}),
      disponible: value.disponible,
      tiempoPreparacionMin: Number(value.tiempoPreparacionMin),
      precios: [
        {
          monedaId: value.monedaId,
          precio: value.precio.trim(),
        },
      ],
      grupoIds: this.selectedGroupIds(),
    };

    this.savingProduct.set(true);
    this.productError.set(null);
    this.success.set(null);

    const editing = this.editingProduct();
    const request = editing
      ? this.catalogApi.updateProduct(editing.id, payload)
      : this.catalogApi.createProduct(payload);

    request.subscribe({
      next: (product) => {
        this.savingProduct.set(false);
        this.productFormOpen.set(false);
        this.success.set(
          editing
            ? `Producto “${product.nombre}” actualizado.`
            : `Producto “${product.nombre}” creado.`,
        );
        this.load();
      },
      error: (error) => {
        this.productError.set(
          this.message(error, 'No se pudo guardar el producto.'),
        );
        this.savingProduct.set(false);
      },
    });
  }

  toggleAvailability(product: Product): void {
    if (!this.canManage() || this.toggling().has(product.id)) {
      return;
    }

    this.toggling.update((current) => new Set(current).add(product.id));

    this.catalogApi
      .updateProduct(product.id, { disponible: !product.disponible })
      .subscribe({
        next: (updated) => {
          this.products.update((products) =>
            products.map((current) =>
              current.id === updated.id ? updated : current,
            ),
          );
          this.toggling.update((current) => {
            const next = new Set(current);
            next.delete(product.id);
            return next;
          });
        },
        error: (error) => {
          this.toggling.update((current) => {
            const next = new Set(current);
            next.delete(product.id);
            return next;
          });
          this.error.set(
            this.message(error, 'No se pudo cambiar la disponibilidad.'),
          );
        },
      });
  }

  openCreateModifierGroup(): void {
    this.modifierForm.reset({
      nombre: '',
      tipo: 'unico',
      minSeleccion: 0,
      maxSeleccion: 1,
      obligatorio: false,
      orden: 0,
      activo: true,
    });
    this.modifierForm.controls.modificadores.clear();
    this.modifierForm.controls.modificadores.push(this.createModifierRow());
    this.modifierError.set(null);
    this.modifierFormOpen.set(true);
  }

  closeModifierForm(): void {
    if (!this.savingModifier()) {
      this.modifierFormOpen.set(false);
      this.modifierError.set(null);
    }
  }

  addModifierRow(): void {
    this.modifierForm.controls.modificadores.push(
      this.createModifierRow(),
    );
  }

  removeModifierRow(index: number): void {
    if (this.modifierForm.controls.modificadores.length <= 1) {
      return;
    }

    this.modifierForm.controls.modificadores.removeAt(index);
  }

  saveModifierGroup(): void {
    if (this.savingModifier()) {
      return;
    }

    if (this.modifierForm.invalid) {
      this.modifierForm.markAllAsTouched();
      return;
    }

    const value = this.modifierForm.getRawValue();
    const min = Number(value.minSeleccion);
    const max = Number(value.maxSeleccion);

    if (min > max) {
      this.modifierError.set(
        'La selección mínima no puede ser mayor que la máxima.',
      );
      return;
    }

    const modificadores = value.modificadores
      .filter((modifier) => modifier.nombre.trim())
      .map((modifier, index) => ({
        nombre: modifier.nombre.trim(),
        tipo: modifier.tipo,
        precioExtra: modifier.precioExtra.trim() || '0.00',
        orden: index,
        activo: true,
      }));

    if (!modificadores.length) {
      this.modifierError.set('Agregue al menos un modificador.');
      return;
    }

    this.savingModifier.set(true);
    this.modifierError.set(null);
    this.success.set(null);

    this.catalogApi
      .createModifierGroup({
        nombre: value.nombre.trim(),
        tipo: value.tipo,
        minSeleccion: min,
        maxSeleccion: max,
        obligatorio: value.obligatorio,
        orden: Number(value.orden),
        activo: value.activo,
        modificadores,
      })
      .subscribe({
        next: (group) => {
          this.savingModifier.set(false);
          this.modifierFormOpen.set(false);
          this.success.set(`Grupo “${group.nombre}” creado.`);
          this.load();
        },
        error: (error) => {
          this.modifierError.set(
            this.message(error, 'No se pudo crear el grupo.'),
          );
          this.savingModifier.set(false);
        },
      });
  }

  openCreateCategory(): void {
    this.editingCategory.set(null);
    this.categoryForm.reset({ nombre: '', orden: 0, activo: true });
    this.categoryError.set(null);
    this.categoryFormOpen.set(true);
  }

  openEditCategory(category: Category): void {
    this.editingCategory.set(category);
    this.categoryForm.reset({
      nombre: category.nombre,
      orden: category.orden,
      activo: category.activo,
    });
    this.categoryError.set(null);
    this.categoryFormOpen.set(true);
  }

  closeCategoryForm(): void {
    if (!this.savingCategory()) {
      this.categoryFormOpen.set(false);
      this.categoryError.set(null);
    }
  }

  saveCategory(): void {
    if (this.savingCategory()) {
      return;
    }

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.getRawValue();
    const payload = {
      nombre: value.nombre.trim(),
      orden: Number(value.orden),
      activo: value.activo,
    };

    this.savingCategory.set(true);
    this.categoryError.set(null);
    this.success.set(null);

    const editing = this.editingCategory();
    const request = editing
      ? this.catalogApi.updateCategory(editing.id, payload)
      : this.catalogApi.createCategory(payload);

    request.subscribe({
      next: (category) => {
        this.savingCategory.set(false);
        this.categoryFormOpen.set(false);
        this.success.set(
          editing
            ? `Categoría “${category.nombre}” actualizada.`
            : `Categoría “${category.nombre}” creada.`,
        );
        this.load();
      },
      error: (error) => {
        this.categoryError.set(
          this.message(error, 'No se pudo guardar la categoría.'),
        );
        this.savingCategory.set(false);
      },
    });
  }

  productPrice(product: Product): string {
    return product.precios[0]?.precio ?? '0.00';
  }

  productModifiers(product: Product): string {
    if (!product.gruposModificadores.length) {
      return 'Sin modificadores';
    }

    return product.gruposModificadores
      .map((group) => group.nombre)
      .join(' · ');
  }

  isGroupSelected(groupId: string): boolean {
    return this.selectedGroupIds().includes(groupId);
  }

  isToggling(productId: string): boolean {
    return this.toggling().has(productId);
  }

  groupSummary(group: ModifierGroup): string {
    return `${group.modificadores.length} opciones · ${
      group.obligatorio ? 'Obligatorio' : 'Opcional'
    }`;
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  private createModifierRow() {
    return this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      tipo: ['agregar' as 'agregar' | 'quitar' | 'nota'],
      precioExtra: [
        '0.00',
        [
          Validators.required,
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ],
      ],
    });
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
