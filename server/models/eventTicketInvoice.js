/**
 * eventTicketType
 *
 * @module      :: Model
 * @description :: eventTicketType model
 *
 */

module.exports = function (we) {
  var model = {
    definition: {
      // // Examples:
      // attrString: { type: we.db.Sequelize.STRING },
      // attrText: { type: we.db.Sequelize.TEXT, formFieldType: 'text' },
      // attrHtml: {
      //  type: we.db.Sequelize.TEXT,
      //  formFieldType: 'html',
      //  formFieldHeight: 200
      //}
    },
    associations: {
      // // Example:
      // NxN assoc
      // assoc1: {
      //  type: 'belongsToMany',
      //  model: 'role',
      //  inverse: 'users',
      //  through: 'users_roles'
      //},
      eventTicketType: {
        type: 'belongsTo',
        model: 'eventTicketType'
      }
    },
    options: {}
  };

  return model;
};