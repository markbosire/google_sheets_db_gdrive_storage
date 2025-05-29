class Todo {
  constructor({ id, title, description, imageId, imageLink, createdAt, updatedAt, completed, userId }) {
    this.id = id || '';
    this.title = title || '';
    this.description = description || '';
    this.imageId = imageId || '';
    this.imageLink = imageLink || '';
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
    this.completed = completed || false;
    this.userId = userId || ''; // Add userId
  }

  validate() {
    if (!this.title) {
      throw new Error('Title is required');
    }
    if (!this.userId) {
      throw new Error('User ID is required');
    }
    return true;
  }
}
module.exports = Todo;
