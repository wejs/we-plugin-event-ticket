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
      // new, used, invalid
      status: {
        type: we.db.Sequelize.STRING(10),
        formFieldType: null, // hide from form
        defaultValue: 'new'
      },

      items: {
        type: we.db.Sequelize.BLOB,
        formFieldType: null
      }
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