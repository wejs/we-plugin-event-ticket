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
      // max number of this tickets that can be purchased
      amount: {
        type: we.db.Sequelize.INTEGER,
        formFieldType: 'number',
        defaultValue: 0,
        allowNull: false
      },
      // count of items sold
      sold: {
        type: we.db.Sequelize.INTEGER,
        formFieldType: null,
        defaultValue: 0
      },

      ticketsAvaibleCount: {
        type: we.db.Sequelize.VIRTUAL,
        formFieldType: null,
        get: function() {
          var c = (this.getDataValue('amount') - this.getDataValue('sold'));

          if (c < 0 ) c = 0;

          return c;
        }
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

        getIdsFromBody: function getIdsFromBody(body) {
          var ids = {};
          var id;

          for(var attr in body) {
            if (attr.startsWith('qt_ett_') && Number(body[attr])) {
              id = attr.replace('qt_ett_', '');
              if (Number(id)) {
                ids[id] = body[attr];
              }
            }
          }

          return ids;
        },
        makeInvoice: function makeInvoice(opts, user) {
          return we.db.defaultConnection
          .transaction(function (t) {
            var fns = [];

            opts.eventTicketType.forEach(function (ett) {
              var total = 0;
              var lines = [];

              // increment sold count
              fns.push(ett.increment('sold', { by: opts.ettsData[ett.id]} ));

              for (var i = 0; i < opts.ettsData[ett.id]; i++) {
                total += ett.price;

                lines.push({
                  description: 'event.ticket.order.item.description',
                  value: ett.price,
                  freight: 0, // Dont need for virtual tickets
                  modelName: 'eventTicketType',
                  modelId: ett.id
                });
              }
              // add create query
              fns.push(
                we.db.models.payment_order.create({
                  description: 'event.ticket.order.description',
                  total: total,
                  currency: we.config.payment.currency,
                  // status: ,
                  orderTypeIdentifier: 'ev-'+ett.eventId+'-tk-'+ett.id,
                  data: {
                    eventTicketType: ett.get(),
                    ettsData: opts.ettsData[ett.id]
                  },
                  costumerId: user.id,
                  lines: lines
                },
                {
                  include: [{
                    model: we.db.models.payment_order_line,
                    as: 'lines'
                  }],
                  transaction: t
                })
                // then check if have vacancy, this prevents parallel insert count errors
                .then(function checkIfHaveTicketsAvaible(order){
                  return we.db.models.eventTicketType.findOne({
                    where: { id: ett.id },
                    attributes: ['sold'],
                    raw: true
                  }, { transaction: t })
                  .then(function (r) {
                    if (ett.amount < r.sold) {
                      // rollback the transaction with error
                      throw new Error('event.ticket.type.sb.sold_out');
                    } else {
                      return order;
                    }
                  })
                })
              );

            });

            return we.db.Sequelize.Promise.all(fns);
          });
        },

        createOneTicket: function createOneTicket(opts) {

          return new we.db.Sequelize.Promise(function(resolve, reject) {
            we.plugins['we-plugin-ticket']
            .createTicket({
              title: opts.event.title,
              typeName: opts.eventTicketType.name,
              typeIdentifier: 'ev-'+opts.event.id+'-t-'+opts.eventTicketType.id,
              date: opts.event.startDate,
              fullName: opts.user.fullName,
              ownerId: opts.user.id,
              location: opts.event.location,
              eventUrl: '/event/'+opts.event.id
            }, function (err, salvedTicket) {
              if (err) {
                reject(err);
              } else {
                resolve(salvedTicket);
              }
            });
          });

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

          record.sold = 0;

          done();
        }
      }
    }
  }

  return model;
}