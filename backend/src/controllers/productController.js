const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class ProductController {
  async getAllProducts(req, res, next) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { name: 'asc' }
      });
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getLowStockProducts(req, res, next) {
    try {
      const products = await prisma.product.findMany({
        where: {
          stockControlled: true,
          stockQuantity: {
            lte: prisma.product.fields.minStockAlert
          }
        }
      });
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new AppError('Produto não encontrado', 404);
      }
      
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }
  
  async createProduct(req, res, next) {
    try {
      const product = await prisma.product.create({
        data: req.body
      });
      
      res.status(201).json({
        success: true,
        data: product,
        message: 'Produto criado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      
      const product = await prisma.product.update({
        where: { id },
        data: req.body
      });
      
      res.json({
        success: true,
        data: product,
        message: 'Produto atualizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity, type, reason } = req.body;
      
      const product = await prisma.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new AppError('Produto não encontrado', 404);
      }
      
      let newQuantity = product.stockQuantity;
      if (type === 'IN') {
        newQuantity += quantity;
      } else if (type === 'OUT') {
        newQuantity -= quantity;
      } else {
        newQuantity = quantity;
      }
      
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { stockQuantity: newQuantity }
      });
      
      await prisma.stockMovement.create({
        data: {
          productId: id,
          type,
          quantity,
          reason,
          userId: req.user.id
        }
      });
      
      res.json({
        success: true,
        data: updatedProduct,
        message: 'Estoque atualizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      
      await prisma.product.delete({
        where: { id }
      });
      
      res.json({
        success: true,
        message: 'Produto excluído com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();