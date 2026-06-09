import { HealthArticle } from '../models/index.js';

export const getArticles = async (req, res, next) => {
  try {
    const { category } = req.query;
    const whereClause = { published: true };

    if (category) {
      whereClause.category = category;
    }

    const articles = await HealthArticle.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(articles);
  } catch (error) {
    next(error);
  }
};

export const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await HealthArticle.findOne({
      where: { id, published: true }
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found or is in draft state.' });
    }

    res.status(200).json(article);
  } catch (error) {
    next(error);
  }
};
