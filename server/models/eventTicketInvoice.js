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
      owner: {
        type: 'belongsTo',
        model: 'user'
      },
      eventTicketType: {
        type: 'belongsTo',
        model: 'eventTicketType'
      }
    },
    options: {}
  };

  return model;
};