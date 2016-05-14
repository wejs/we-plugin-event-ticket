/**
 * Event eventTicketType type
 *
 * @module      :: Model
 * @description :: Event system ticket type model
 *
 */

module.exports = function Model(we) {
  var model = {
    definition: {
      name: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: we.db.Sequelize.DECIMAL(10, 2),
        formFieldType: 'event-price',
        defaultValue: 0
      },
      description: {
        type: we.db.Sequelize.TEXT,
        formFieldType: 'html',
        formFieldHeight: 300
      },
      maxForEachUser: {
        type: we.db.Sequelize.INTEGER,
        formFieldType: 'number',
        defaultValue: 1
      },
      amount: {
        type: we.db.Sequelize.INTEGER,
        formFieldType: 'number',
        defaultValue: 0,
        allowNull: false
      },

      startDate: { type: we.db.Sequelize.DATE },
      endDate: {
        type: we.db.Sequelize.DATE,
        allowNull: false
      },

      maxToSelect: {
        type: we.db.Sequelize.VIRTUAL,
        formFieldType: null,
        get: function() {
          var items = [];
          var id = this.getDataValue('id');
          var maxForEachUser = this.getDataValue('maxForEachUser');

          for (var i = 1; i <= maxForEachUser; i++) {
            items.push({
              val: id+'-'+i,
              total: i
            });
          }

          return items;
        }
      }
    },
    associations: {
      event: {
        type: 'belongsTo',
        model: 'event'
      }
    },
    options: {
      titleField: 'name',
      classMethods: {
        /**
         * Context loader, preload current request record and related data
         *
         * @param  {Object}   req  express.js request
         * @param  {Object}   res  express.js response
         * @param  {Function} done callback
         */
        contextLoader: function contextLoader(req, res, done) {
          if (!res.locals.id || !res.locals.loadCurrentRecord) return done();

          return this.find({
            where: { id: res.locals.id },
            include: [{ all: true }]
          }).then(function (record) {
            res.locals.data = record;

            // in other event
            if (record && req.params.eventId) {
              if (req.params.eventId != record.eventId) {
                return res.notFound();
              }
            }

            if (record && record.dataValues.creatorId && req.isAuthenticated()) {
              // ser role owner
              if (record.isOwner(req.user.id)) {
                if (req.userRoleNames.indexOf('owner') == -1 ) req.userRoleNames.push('owner');
              }
            }

            return done();
          });
        },

        loadUserTickets: function() {

        }
      },
      instanceMethods: {
        getUrlPath: function getUrlPath() {
          return we.router.urlTo(
            'eventTicketType.findOne', [this.eventId, this.id]
          );
        }
      },
      hooks: {
        beforeCreate: function beforeCreate(record, opts, done) {
          if (!record.eventId) return done('eventTicketType.error.required.eventId');
          done();
        }
      }
    }
  }

  return model;
}