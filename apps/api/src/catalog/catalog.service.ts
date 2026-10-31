import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  CreateModifierDto,
  CreateModifierGroupDto,
  LinkModifierGroupDto,
  UpdateModifierDto,
  UpdateModifierGroupDto,
} from './dto/modifier.dto';
import {
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

const productInclude = {
  categoria: true,
  precios: { include: { moneda: true } },
  gruposModificadores: {
    orderBy: { orden: 'asc' },
    include: {
      grupo: {
        include: {
          modificadores: { orderBy: { orden: 'asc' } },
        },
      },
    },
  },
} satisfies Prisma.ProductoInclude;

type ProductWithRelations = Prisma.ProductoGetPayload<{
  include: typeof productInclude;
}>;

const groupInclude = {
  modificadores: { orderBy: { orden: 'asc' } },
  _count: { select: { productos: true } },
} satisfies Prisma.GrupoModificadorInclude;

type GroupWithRelations = Prisma.GrupoModificadorGetPayload<{
  include: typeof groupInclude;
}>;

const categoryInclude = {
  _count: { select: { productos: true } },
} satisfies Prisma.CategoriaInclude;

type CategoryWithCount = Prisma.CategoriaGetPayload<{
  include: typeof categoryInclude;
}>;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCategories(current: AuthenticatedUser) {
    const categories = await this.prisma.categoria.findMany({
      where: { negocioId: current.negocioId, activo: true },
      orderBy: { orden: 'asc' },
      include: categoryInclude,
    });

    return categories.map((category) => this.mapCategory(category));
  }

  listCurrencies() {
    return this.prisma.moneda.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        simbolo: true,
        activo: true,
      },
    });
  }

  async createCategory(dto: CreateCategoryDto, current: AuthenticatedUser) {
    const existing = await this.prisma.categoria.findFirst({
      where: {
        negocioId: current.negocioId,
        nombre: dto.nombre,
        activo: true,
      },
    });

    if (existing) {
      throw new ConflictException('La categoría ya existe');
    }

    const category = await this.prisma.categoria.create({
      data: {
        negocioId: current.negocioId,
        nombre: dto.nombre,
        orden: dto.orden ?? 0,
        activo: dto.activo ?? true,
      },
      include: categoryInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.categoria.crear',
      entidad: 'categoria',
      entidadId: category.id,
      datosDespues: this.auditPayload(this.mapCategory(category)),
    });

    return this.mapCategory(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.categoria.findFirst({
      where: { id, negocioId: current.negocioId },
      include: categoryInclude,
    });

    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (dto.nombre && dto.nombre !== existing.nombre) {
      const duplicate = await this.prisma.categoria.findFirst({
        where: {
          negocioId: current.negocioId,
          nombre: dto.nombre,
          activo: true,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('La categoría ya existe');
      }
    }

    const category = await this.prisma.categoria.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
      include: categoryInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.categoria.actualizar',
      entidad: 'categoria',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapCategory(existing)),
      datosDespues: this.auditPayload(this.mapCategory(category)),
    });

    return this.mapCategory(category);
  }

  async listProducts(
    query: ListProductsQueryDto,
    current: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ProductoWhereInput = {
      categoria: { negocioId: current.negocioId },
      activo: true,
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(query.disponible !== undefined
        ? { disponible: query.disponible === 'true' }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                nombre: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                descripcion: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.producto.count({ where }),
      this.prisma.producto.findMany({
        where,
        include: productInclude,
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: products.map((product) => this.mapProduct(product)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findProduct(id: string, current: AuthenticatedUser) {
    const product = await this.prisma.producto.findFirst({
      where: { id, categoria: { negocioId: current.negocioId } },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.mapProduct(product);
  }

  async createProduct(dto: CreateProductDto, current: AuthenticatedUser) {
    await this.assertCategory(dto.categoriaId, current.negocioId);
    await this.assertCurrencies(dto.precios.map((price) => price.monedaId));
    await this.assertGroups(dto.grupoIds ?? [], current.negocioId);

    const product = await this.prisma.producto.create({
      data: {
        categoriaId: dto.categoriaId,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        imagenUrl: dto.imagenUrl ?? null,
        disponible: dto.disponible ?? true,
        disponibleDesde: dto.disponibleDesde ?? null,
        disponibleHasta: dto.disponibleHasta ?? null,
        diasSemana: dto.diasSemana ?? [],
        tiempoPreparacionMin: dto.tiempoPreparacionMin ?? 5,
        impuestoPorcentaje: dto.impuestoPorcentaje ?? null,
        orden: dto.orden ?? 0,
        precios: {
          create: dto.precios.map((price) => ({
            monedaId: price.monedaId,
            precio: price.precio,
          })),
        },
        gruposModificadores: dto.grupoIds?.length
          ? {
              create: dto.grupoIds.map((grupoId, index) => ({
                grupoId,
                orden: index,
              })),
            }
          : undefined,
      },
      include: productInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.producto.crear',
      entidad: 'producto',
      entidadId: product.id,
      datosDespues: this.auditPayload(this.mapProduct(product)),
    });

    return this.mapProduct(product);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.producto.findFirst({
      where: { id, categoria: { negocioId: current.negocioId } },
      include: productInclude,
    });

    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (dto.categoriaId) {
      await this.assertCategory(dto.categoriaId, current.negocioId);
    }
    if (dto.precios) {
      await this.assertCurrencies(
        dto.precios.map((price) => price.monedaId),
      );
    }
    if (dto.grupoIds) {
      await this.assertGroups(dto.grupoIds, current.negocioId);
    }

    const scalarData: Prisma.ProductoUpdateInput = {
      ...(dto.categoriaId !== undefined
        ? { categoria: { connect: { id: dto.categoriaId } } }
        : {}),
      ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
      ...(dto.descripcion !== undefined
        ? { descripcion: dto.descripcion }
        : {}),
      ...(dto.imagenUrl !== undefined
        ? { imagenUrl: dto.imagenUrl }
        : {}),
      ...(dto.disponible !== undefined
        ? { disponible: dto.disponible }
        : {}),
      ...(dto.disponibleDesde !== undefined
        ? { disponibleDesde: dto.disponibleDesde }
        : {}),
      ...(dto.disponibleHasta !== undefined
        ? { disponibleHasta: dto.disponibleHasta }
        : {}),
      ...(dto.diasSemana !== undefined
        ? { diasSemana: dto.diasSemana }
        : {}),
      ...(dto.tiempoPreparacionMin !== undefined
        ? { tiempoPreparacionMin: dto.tiempoPreparacionMin }
        : {}),
      ...(dto.impuestoPorcentaje !== undefined
        ? { impuestoPorcentaje: dto.impuestoPorcentaje }
        : {}),
      ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.precios) {
        await tx.productoPrecio.deleteMany({ where: { productoId: id } });
        await tx.productoPrecio.createMany({
          data: dto.precios.map((price) => ({
            productoId: id,
            monedaId: price.monedaId,
            precio: price.precio,
          })),
        });
      }

      if (dto.grupoIds) {
        await tx.productoGrupoModificador.deleteMany({
          where: { productoId: id },
        });

        if (dto.grupoIds.length) {
          await tx.productoGrupoModificador.createMany({
            data: dto.grupoIds.map((grupoId, index) => ({
              productoId: id,
              grupoId,
              orden: index,
            })),
          });
        }
      }

      return tx.producto.update({
        where: { id },
        data: scalarData,
        include: productInclude,
      });
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.producto.actualizar',
      entidad: 'producto',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapProduct(existing)),
      datosDespues: this.auditPayload(this.mapProduct(updated)),
    });

    return this.mapProduct(updated);
  }

  async listModifierGroups(current: AuthenticatedUser) {
    const groups = await this.prisma.grupoModificador.findMany({
      where: { negocioId: current.negocioId, activo: true },
      orderBy: { orden: 'asc' },
      include: groupInclude,
    });

    return groups.map((group) => this.mapGroup(group));
  }

  async createModifierGroup(
    dto: CreateModifierGroupDto,
    current: AuthenticatedUser,
  ) {
    const group = await this.prisma.grupoModificador.create({
      data: {
        negocioId: current.negocioId,
        nombre: dto.nombre,
        tipo: dto.tipo ?? 'unico',
        minSeleccion: dto.minSeleccion ?? 0,
        maxSeleccion: dto.maxSeleccion ?? 1,
        obligatorio: dto.obligatorio ?? false,
        orden: dto.orden ?? 0,
        activo: dto.activo ?? true,
        modificadores: dto.modificadores?.length
          ? {
              create: dto.modificadores.map((modifier, index) => ({
                nombre: modifier.nombre,
                tipo: modifier.tipo ?? 'agregar',
                precioExtra: modifier.precioExtra ?? '0.00',
                orden: modifier.orden ?? index,
                activo: modifier.activo ?? true,
              })),
            }
          : undefined,
      },
      include: groupInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.grupo.crear',
      entidad: 'grupo_modificador',
      entidadId: group.id,
      datosDespues: this.auditPayload(this.mapGroup(group)),
    });

    return this.mapGroup(group);
  }

  async updateModifierGroup(
    id: string,
    dto: UpdateModifierGroupDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.grupoModificador.findFirst({
      where: { id, negocioId: current.negocioId },
      include: groupInclude,
    });

    if (!existing) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    const { modificadores: _modificadores, ...groupData } = dto;

    const group = await this.prisma.grupoModificador.update({
      where: { id },
      data: {
        ...(groupData.nombre !== undefined
          ? { nombre: groupData.nombre }
          : {}),
        ...(groupData.tipo !== undefined
          ? { tipo: groupData.tipo }
          : {}),
        ...(groupData.minSeleccion !== undefined
          ? { minSeleccion: groupData.minSeleccion }
          : {}),
        ...(groupData.maxSeleccion !== undefined
          ? { maxSeleccion: groupData.maxSeleccion }
          : {}),
        ...(groupData.obligatorio !== undefined
          ? { obligatorio: groupData.obligatorio }
          : {}),
        ...(groupData.orden !== undefined
          ? { orden: groupData.orden }
          : {}),
        ...(groupData.activo !== undefined
          ? { activo: groupData.activo }
          : {}),
      },
      include: groupInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.grupo.actualizar',
      entidad: 'grupo_modificador',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapGroup(existing)),
      datosDespues: this.auditPayload(this.mapGroup(group)),
    });

    return this.mapGroup(group);
  }

  async createModifier(
    groupId: string,
    dto: CreateModifierDto,
    current: AuthenticatedUser,
  ) {
    const group = await this.prisma.grupoModificador.findFirst({
      where: { id: groupId, negocioId: current.negocioId },
    });

    if (!group) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    const modifier = await this.prisma.modificador.create({
      data: {
        grupoId: groupId,
        nombre: dto.nombre,
        tipo: dto.tipo ?? 'agregar',
        precioExtra: dto.precioExtra ?? '0.00',
        orden: dto.orden ?? 0,
        activo: dto.activo ?? true,
      },
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.modificador.crear',
      entidad: 'modificador',
      entidadId: modifier.id,
      datosDespues: this.auditPayload(modifier),
    });

    return this.mapModifier(modifier);
  }

  async updateModifier(
    id: string,
    dto: UpdateModifierDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.modificador.findFirst({
      where: { id, grupo: { negocioId: current.negocioId } },
    });

    if (!existing) {
      throw new NotFoundException('Modificador no encontrado');
    }

    const modifier = await this.prisma.modificador.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.precioExtra !== undefined
          ? { precioExtra: dto.precioExtra }
          : {}),
        ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.modificador.actualizar',
      entidad: 'modificador',
      entidadId: id,
      datosAntes: this.auditPayload(existing),
      datosDespues: this.auditPayload(modifier),
    });

    return this.mapModifier(modifier);
  }

  async linkModifierGroup(
    productId: string,
    dto: LinkModifierGroupDto,
    current: AuthenticatedUser,
  ) {
    const product = await this.prisma.producto.findFirst({
      where: { id: productId, categoria: { negocioId: current.negocioId } },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const group = await this.prisma.grupoModificador.findFirst({
      where: { id: dto.grupoId, negocioId: current.negocioId },
    });

    if (!group) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    const link = await this.prisma.productoGrupoModificador.upsert({
      where: {
        productoId_grupoId: {
          productoId: productId,
          grupoId: dto.grupoId,
        },
      },
      update: { orden: dto.orden ?? 0 },
      create: {
        productoId: productId,
        grupoId: dto.grupoId,
        orden: dto.orden ?? 0,
      },
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.producto.grupo.vincular',
      entidad: 'producto',
      entidadId: productId,
      datosDespues: this.auditPayload({
        grupoId: dto.grupoId,
        orden: link.orden,
      }),
    });

    return link;
  }

  async unlinkModifierGroup(
    productId: string,
    groupId: string,
    current: AuthenticatedUser,
  ) {
    const product = await this.prisma.producto.findFirst({
      where: { id: productId, categoria: { negocioId: current.negocioId } },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const group = await this.prisma.grupoModificador.findFirst({
      where: { id: groupId, negocioId: current.negocioId },
    });

    if (!group) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    await this.prisma.productoGrupoModificador.deleteMany({
      where: { productoId: productId, grupoId: groupId },
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'catalogo.producto.grupo.desvincular',
      entidad: 'producto',
      entidadId: productId,
      datosAntes: this.auditPayload({ grupoId: groupId }),
    });

    return { success: true };
  }

  async getPublicMenu(codigoQr: string) {
    const mesa = await this.prisma.mesa.findUnique({
      where: { codigoQr },
      include: {
        zona: {
          include: {
            sucursal: {
              include: {
                negocio: { include: { monedaPrincipal: true } },
              },
            },
          },
        },
      },
    });

    if (
      !mesa ||
      !mesa.activo ||
      !mesa.zona.activo ||
      !mesa.zona.sucursal.activo ||
      !mesa.zona.sucursal.negocio.activo
    ) {
      throw new NotFoundException('Mesa no encontrada');
    }

    const negocio = mesa.zona.sucursal.negocio;
    const categories = await this.prisma.categoria.findMany({
      where: { negocioId: negocio.id, activo: true },
      orderBy: { orden: 'asc' },
      include: {
        productos: {
          where: { activo: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
          include: {
            precios: { include: { moneda: true } },
            gruposModificadores: {
              where: { grupo: { activo: true } },
              orderBy: { orden: 'asc' },
              include: {
                grupo: {
                  include: {
                    modificadores: {
                      where: { activo: true },
                      orderBy: { orden: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      negocio: {
        id: negocio.id,
        nombre: negocio.nombre,
        logoUrl: negocio.logoUrl,
        monedaPrincipal: {
          id: negocio.monedaPrincipal.id,
          codigo: negocio.monedaPrincipal.codigo,
          simbolo: negocio.monedaPrincipal.simbolo,
        },
      },
      sucursal: {
        id: mesa.zona.sucursal.id,
        nombre: mesa.zona.sucursal.nombre,
      },
      mesa: {
        id: mesa.id,
        numero: mesa.numero,
        codigoQr: mesa.codigoQr,
      },
      categorias: categories.map((category) => ({
        id: category.id,
        nombre: category.nombre,
        orden: category.orden,
        productos: category.productos.map((product) => ({
          id: product.id,
          nombre: product.nombre,
          descripcion: product.descripcion,
          imagenUrl: product.imagenUrl,
          disponible: product.disponible,
          tiempoPreparacionMin: product.tiempoPreparacionMin,
          precios: product.precios.map((price) => ({
            monedaId: price.monedaId,
            codigo: price.moneda.codigo,
            simbolo: price.moneda.simbolo,
            precio: this.money(price.precio),
          })),
          gruposModificadores: product.gruposModificadores.map((link) => ({
            id: link.grupo.id,
            nombre: link.grupo.nombre,
            tipo: link.grupo.tipo,
            minSeleccion: link.grupo.minSeleccion,
            maxSeleccion: link.grupo.maxSeleccion,
            obligatorio: link.grupo.obligatorio,
            orden: link.orden,
            modificadores: link.grupo.modificadores.map((modifier) => ({
              id: modifier.id,
              nombre: modifier.nombre,
              tipo: modifier.tipo,
              precioExtra: this.money(modifier.precioExtra),
              orden: modifier.orden,
            })),
          })),
        })),
      })),
    };
  }

  private async assertCategory(categoriaId: string, negocioId: string) {
    const category = await this.prisma.categoria.findFirst({
      where: { id: categoriaId, negocioId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }

  private async assertCurrencies(monedaIds: string[]) {
    const ids = [...new Set(monedaIds)];
    const count = await this.prisma.moneda.count({
      where: { id: { in: ids } },
    });

    if (count !== ids.length) {
      throw new NotFoundException('Moneda no encontrada');
    }
  }

  private async assertGroups(grupoIds: string[], negocioId: string) {
    if (!grupoIds.length) return;

    const ids = [...new Set(grupoIds)];
    const count = await this.prisma.grupoModificador.count({
      where: { id: { in: ids }, negocioId },
    });

    if (count !== ids.length) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }
  }

  private mapCategory(category: CategoryWithCount) {
    return {
      id: category.id,
      negocioId: category.negocioId,
      nombre: category.nombre,
      orden: category.orden,
      activo: category.activo,
      productosCount: category._count.productos,
    };
  }

  private mapProduct(product: ProductWithRelations) {
    return {
      id: product.id,
      categoriaId: product.categoriaId,
      categoria: {
        id: product.categoria.id,
        nombre: product.categoria.nombre,
      },
      nombre: product.nombre,
      descripcion: product.descripcion,
      imagenUrl: product.imagenUrl,
      disponible: product.disponible,
      disponibleDesde: product.disponibleDesde,
      disponibleHasta: product.disponibleHasta,
      diasSemana: product.diasSemana,
      tiempoPreparacionMin: product.tiempoPreparacionMin,
      impuestoPorcentaje: product.impuestoPorcentaje
        ? this.money(product.impuestoPorcentaje)
        : null,
      orden: product.orden,
      activo: product.activo,
      precios: product.precios.map((price) => ({
        monedaId: price.monedaId,
        moneda: {
          codigo: price.moneda.codigo,
          simbolo: price.moneda.simbolo,
        },
        precio: this.money(price.precio),
      })),
      gruposModificadores: product.gruposModificadores.map((link) => ({
        id: link.grupo.id,
        nombre: link.grupo.nombre,
        tipo: link.grupo.tipo,
        minSeleccion: link.grupo.minSeleccion,
        maxSeleccion: link.grupo.maxSeleccion,
        obligatorio: link.grupo.obligatorio,
        orden: link.orden,
        modificadores: link.grupo.modificadores.map((modifier) => ({
          id: modifier.id,
          nombre: modifier.nombre,
          tipo: modifier.tipo,
          precioExtra: this.money(modifier.precioExtra),
          orden: modifier.orden,
          activo: modifier.activo,
        })),
      })),
    };
  }

  private mapGroup(group: GroupWithRelations) {
    return {
      id: group.id,
      negocioId: group.negocioId,
      nombre: group.nombre,
      tipo: group.tipo,
      minSeleccion: group.minSeleccion,
      maxSeleccion: group.maxSeleccion,
      obligatorio: group.obligatorio,
      orden: group.orden,
      activo: group.activo,
      productosCount: group._count.productos,
      modificadores: group.modificadores.map((modifier) =>
        this.mapModifier(modifier),
      ),
    };
  }

  private mapModifier(modifier: {
    id: string;
    grupoId: string;
    nombre: string;
    tipo: string;
    precioExtra: { toFixed(digits: number): string };
    orden: number;
    activo: boolean;
  }) {
    return {
      id: modifier.id,
      grupoId: modifier.grupoId,
      nombre: modifier.nombre,
      tipo: modifier.tipo,
      precioExtra: this.money(modifier.precioExtra),
      orden: modifier.orden,
      activo: modifier.activo,
    };
  }

  private money(value: { toFixed(digits: number): string }): string {
    return value.toFixed(2);
  }

  private auditPayload(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
