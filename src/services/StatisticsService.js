import logger from "../config/logger.js";
import TicketRepository from "../repositories/TicketRepository.js";
import UserRepository from "../repositories/UserRepository.js";

class StatisticsService {
  /**
   * Obtenir les statistiques globales des billets
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Statistiques
   */
  async getGlobalStats(currentUser) {
    try {
      const stats = await TicketRepository.getStats({
        userId: currentUser.id,
        role: currentUser.role,
      });

      // Convertir les strings en nombres
      const formattedStats = {
        total: parseInt(stats.total) || 0,
        used: parseInt(stats.used) || 0,
        available: parseInt(stats.available) || 0,
        sent: parseInt(stats.sent) || 0,
        vip: parseInt(stats.vip) || 0,
        standard: parseInt(stats.standard) || 0,
        earlybird: parseInt(stats.earlybird) || 0,
        revenue: parseInt(stats.revenue) || 0,
        orders: parseInt(stats.orders) || 0,
      };

      // Calculer des métriques supplémentaires
      formattedStats.usageRate =
        formattedStats.total > 0
          ? Math.round((formattedStats.used / formattedStats.total) * 100)
          : 0;

      formattedStats.sentRate =
        formattedStats.total > 0
          ? Math.round((formattedStats.sent / formattedStats.total) * 100)
          : 0;

      formattedStats.averageTicketPrice =
        formattedStats.total > 0
          ? Math.round(formattedStats.revenue / formattedStats.total)
          : 0;

      formattedStats.averageOrderSize =
        formattedStats.orders > 0
          ? Math.round(formattedStats.total / formattedStats.orders)
          : 0;

      return formattedStats;
    } catch (error) {
      logger.error("Erreur stats globales:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques par vendeur (admin uniquement)
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Array>} Statistiques par vendeur
   */
  async getVendorStats(currentUser) {
    try {
      // Seul l'admin peut voir les stats par vendeur
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      const stats = await TicketRepository.getVendorStats();

      // Formater les statistiques
      const formattedStats = stats.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        phone: vendor.phone,
        tickets: parseInt(vendor.tickets) || 0,
        revenue: parseInt(vendor.revenue) || 0,
        vip: parseInt(vendor.vip) || 0,
        standard: parseInt(vendor.standard) || 0,
        earlybird: parseInt(vendor.earlybird) || 0,
        used: parseInt(vendor.used) || 0,
        orders: parseInt(vendor.orders) || 0,
        averageTicketPrice:
          parseInt(vendor.tickets) > 0
            ? Math.round(parseInt(vendor.revenue) / parseInt(vendor.tickets))
            : 0,
        usageRate:
          parseInt(vendor.tickets) > 0
            ? Math.round(
                (parseInt(vendor.used) / parseInt(vendor.tickets)) * 100
              )
            : 0,
      }));

      // Trier par revenue décroissant
      formattedStats.sort((a, b) => b.revenue - a.revenue);

      return formattedStats;
    } catch (error) {
      logger.error("Erreur stats vendeurs:", error);
      throw error;
    }
  }

  /**
   * Obtenir les commandes avec pagination
   * @param {Object} options - Options de pagination
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Commandes paginées
   */
  async getOrders(options, currentUser) {
    try {
      const searchOptions = {
        ...options,
        userId: currentUser.id,
        role: currentUser.role,
      };

      const result = await TicketRepository.getOrders(searchOptions);

      // Formater les commandes
      const formattedOrders = result.orders.map((order) => ({
        orderId: order.order_id,
        clientName: order.client_name,
        clientPhone: order.client_phone,
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        createdBy: order.created_by,
        vendorName: order.vendor_name,
        ticketCount: parseInt(order.ticket_count),
        total: parseInt(order.total),
      }));

      return {
        orders: formattedOrders,
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error("Erreur récupération commandes:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'une commande spécifique
   * @param {string} orderId - ID de la commande
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Statistiques de la commande
   */
  async getOrderStats(orderId, currentUser) {
    try {
      const tickets = await TicketRepository.findByOrderId(orderId);

      if (tickets.length === 0) {
        throw new Error("Commande non trouvée");
      }

      // Vérifier les permissions
      if (
        currentUser.role !== "admin" &&
        tickets[0].createdBy !== currentUser.id
      ) {
        throw new Error("Accès non autorisé");
      }

      // Calculer les statistiques
      const stats = {
        orderId,
        ticketCount: tickets.length,
        total: tickets.reduce((sum, t) => sum + t.price, 0),
        used: tickets.filter((t) => t.used).length,
        sent: tickets.filter((t) => t.sentWhatsapp).length,
        categories: {
          vip: tickets.filter((t) => t.category === "vip").length,
          standard: tickets.filter((t) => t.category === "standard").length,
        },
        clientName: tickets[0].clientName,
        clientPhone: tickets[0].clientPhone,
        paymentMethod: tickets[0].paymentMethod,
        createdAt: tickets[0].createdAt,
        vendorName: tickets[0].vendorName,
      };

      return stats;
    } catch (error) {
      logger.error("Erreur stats commande:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques par catégorie
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Stats par catégorie
   */
  async getCategoryStats(currentUser) {
    try {
      const globalStats = await this.getGlobalStats(currentUser);

      return {
        vip: {
          count: globalStats.vip,
          percentage:
            globalStats.total > 0
              ? Math.round((globalStats.vip / globalStats.total) * 100)
              : 0,
          price: 15000,
          revenue: globalStats.vip * 15000,
        },
        standard: {
          count: globalStats.standard,
          percentage:
            globalStats.total > 0
              ? Math.round((globalStats.standard / globalStats.total) * 100)
              : 0,
          price: 7500,
          revenue: globalStats.standard * 7500,
        },
        earlybird: {
          count: globalStats.earlybird,
          percentage:
            globalStats.total > 0
              ? Math.round((globalStats.earlybird / globalStats.total) * 100)
              : 0,
          price: 5000,
          revenue: globalStats.earlybird * 5000,
        },
      };
    } catch (error) {
      logger.error("Erreur stats catégories:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques temporelles (par jour)
   * @param {number} days - Nombre de jours
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Array>} Stats par jour
   */
  async getTimeStats(days, currentUser) {
    try {
      // Cette fonctionnalité nécessiterait une requête SQL plus complexe
      // Pour l'instant, retourner les stats globales
      const stats = await this.getGlobalStats(currentUser);

      return {
        period: `${days} derniers jours`,
        stats,
      };
    } catch (error) {
      logger.error("Erreur stats temporelles:", error);
      throw error;
    }
  }

  /**
   * Obtenir un tableau de bord complet
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Dashboard complet
   */
  async getDashboard(currentUser) {
    try {
      const [globalStats, categoryStats, orders] = await Promise.all([
        this.getGlobalStats(currentUser),
        this.getCategoryStats(currentUser),
        this.getOrders({ page: 1, limit: 5 }, currentUser),
      ]);

      // Stats vendeurs seulement pour l'admin
      let vendorStats = null;
      if (currentUser.role === "admin") {
        vendorStats = await this.getVendorStats(currentUser);
      }

      return {
        global: globalStats,
        categories: categoryStats,
        recentOrders: orders.orders,
        vendors: vendorStats,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Erreur dashboard:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques utilisateurs (admin uniquement)
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Stats utilisateurs
   */
  async getUserStats(currentUser) {
    try {
      // Seul l'admin peut voir
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      const stats = await UserRepository.getStats();

      return {
        total: parseInt(stats.total) || 0,
        admins: parseInt(stats.admins) || 0,
        vendors: parseInt(stats.vendors) || 0,
        active: parseInt(stats.active) || 0,
        inactive: parseInt(stats.inactive) || 0,
        activeLastWeek: parseInt(stats.active_last_week) || 0,
      };
    } catch (error) {
      logger.error("Erreur stats utilisateurs:", error);
      throw error;
    }
  }
}

export default new StatisticsService();
