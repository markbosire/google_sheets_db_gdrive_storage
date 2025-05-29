// ===== FILE: ./models/User.js =====
const bcrypt = require('bcryptjs');

class User {
  constructor({ id, username, password, role }) {
    this.id = id || '';
    this.username = username || '';
    this.password = password || '';
    this.role = role || 'user'; // Default role is 'user'
  }

  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    return this;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  validate() {
    if (!this.username || !this.password) {
      throw new Error('Username and password are required');
    }
    if (this.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role
    };
  }
}

module.exports = User;