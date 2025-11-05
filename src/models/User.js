import bcrypt from "bcryptjs";
import config from "../config/config.js";

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password = data.password;
    this.name = data.name;
    this.phone = data.phone;
    this.role = data.role || config.userRoles.VENDOR;
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.lastLogin = data.last_login;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Méthode pour vérifier si l'utilisateur est admin
  isAdmin() {
    return this.role === config.userRoles.ADMIN;
  }

  // Méthode pour vérifier si l'utilisateur est vendeur
  isVendor() {
    return this.role === config.userRoles.VENDOR;
  }

  // Méthode pour obtenir une représentation sécurisée (sans mot de passe)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      phone: this.phone,
      role: this.role,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Méthode statique pour hasher un mot de passe
  static async hashPassword(password) {
    return await bcrypt.hash(password, config.security.bcryptSaltRounds);
  }

  // Méthode pour comparer les mots de passe
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Méthode statique pour valider les données d'un utilisateur
  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!data.username || data.username.length < 3) {
        errors.push("Le nom d'utilisateur doit contenir au moins 3 caractères");
      }

      if (!data.password || data.password.length < 6) {
        errors.push("Le mot de passe doit contenir au moins 6 caractères");
      }

      if (!data.name || data.name.length < 2) {
        errors.push("Le nom doit contenir au moins 2 caractères");
      }
    }

    if (data.role && !Object.values(config.userRoles).includes(data.role)) {
      errors.push("Rôle invalide");
    }

    if (data.phone && !/^\+?\d{10,15}$/.test(data.phone.replace(/\s/g, ""))) {
      errors.push("Format de téléphone invalide");
    }

    return errors;
  }

  // Méthode pour obtenir les permissions de l'utilisateur
  getPermissions() {
    if (this.isAdmin()) {
      return [
        "tickets:create",
        "tickets:read:all",
        "tickets:update",
        "tickets:delete",
        "tickets:scan",
        "users:create",
        "users:read:all",
        "users:update",
        "users:delete",
        "stats:read:all",
        "orders:read:all",
      ];
    } else if (this.isVendor()) {
      return [
        "tickets:create",
        "tickets:read:own",
        "tickets:scan",
        "stats:read:own",
        "orders:read:own",
      ];
    }
    return [];
  }

  // Vérifier si l'utilisateur a une permission
  hasPermission(permission) {
    return this.getPermissions().includes(permission);
  }
}

export default User;
