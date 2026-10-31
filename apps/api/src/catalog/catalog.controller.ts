import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CatalogService } from './catalog.service';
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

@ApiTags('catalog')
@ApiBearerAuth()
@RequirePermissions('catalogo.ver')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('currencies')
  listCurrencies() {
    return this.catalogService.listCurrencies();
  }

  @Get('categories')
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listCategories(user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Post('categories')
  createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.createCategory(dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateCategory(id, dto, user);
  }

  @Get('products')
  listProducts(
    @Query() query: ListProductsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.listProducts(query, user);
  }

  @Get('products/:id')
  findProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.findProduct(id, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Post('products')
  createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.createProduct(dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateProduct(id, dto, user);
  }

  @Get('modifier-groups')
  listModifierGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listModifierGroups(user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Post('modifier-groups')
  createModifierGroup(
    @Body() dto: CreateModifierGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.createModifierGroup(dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Patch('modifier-groups/:id')
  updateModifierGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModifierGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateModifierGroup(id, dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Post('modifier-groups/:id/modifiers')
  createModifier(
    @Param('id') groupId: string,
    @Body() dto: CreateModifierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.createModifier(groupId, dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Patch('modifiers/:id')
  updateModifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModifierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateModifier(id, dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Post('products/:id/modifier-groups')
  linkModifierGroup(
    @Param('id') productId: string,
    @Body() dto: LinkModifierGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.linkModifierGroup(productId, dto, user);
  }

  @RequirePermissions('catalogo.gestionar')
  @Delete('products/:id/modifier-groups/:groupId')
  unlinkModifierGroup(
    @Param('id') productId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.unlinkModifierGroup(
      productId,
      groupId,
      user,
    );
  }
}
