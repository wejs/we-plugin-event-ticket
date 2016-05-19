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
      },
      paymentLineIdentifier: {
        type: we.db.Sequelize.VIRTUAL,
        formFieldType: null,
        get: function(){
          return 'ev-'+this.getDataValue('eventId')+'-ticket-'+this.getDataValue('id');
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
            var lines = [];
            var total = 0;

            // get all tickets data
            opts.eventTicketType.forEach(function (ett) {

              // 3- increment sold count
              fns.push(ett.increment('sold', { by: opts.ettsData[ett.id] } ));

              for (var i = 0; i < opts.ettsData[ett.id]; i++) {
                total += ett.price;

                lines.push({
                  description: 'event.ticket.order.item.description',
                  value: ett.price,
                  freight: 0, // Dont need for virtual tickets
                  modelName: 'eventTicketType',
                  modelId: ett.id,
                  orderLineIdentifier: 'ev-'+opts.event.id+'-ticket-'+ett.id,
                  hookAfterSuccess: 'we-plugin-event-ticket:after:order:item:payment:success',
                  hookAfterCancel: 'we-plugin-event-ticket:after:order:item:payment:cancel'
                });
              }

            });

            // 4- create one payment order for all tickets
            fns.push(
              we.db.models.payment_order.create({
                description: 'event.ticket.order.description',
                total: total,
                currency: we.config.payment.currency,
                // status: ,
                orderTypeIdentifier: 'ev-'+opts.event.id+'-ticket',
                data: {
                  eventId: opts.event.id,
                  ettsData: opts.ettsData
                },
                costumerId: user.id,
                lines: lines,
                hookAfterSuccess: 'we-plugin-event-ticket:after:order:payment:success',
                hookAfterCancel: 'we-plugin-event-ticket:after:order:payment:cancel'
              },
              {
                include: [{
                  model: we.db.models.payment_order_line,
                  as: 'lines'
                }],
                transaction: t
              })
              // 5- check if have vacancy, this prevents parallel insert count errors
              .then(function checkIfHaveTicketsAvaible(order) {
                var ettIds = [];
                // get all tickets data
                for (var i = 0; i < opts.eventTicketType.length; i++) {
                  ettIds.push(opts.eventTicketType[i].id);
                }

                return we.db.models.eventTicketType.findAll({
                  where: { id: ettIds },
                  attributes: ['sold', 'amount'],
                  raw: true
                })
                .then(function (etts) {
                  for (var i = 0; i < etts.length; i++) {
                    if ( (etts[i].amount-etts[i].sold) < 0) {
                      // rollback the transaction with error
                      throw new Error('event.ticket.type.sb.sold_out');
                    }
                  }

                  return order;
                });
              })
            );

            fns.push(we.db.models.eventTicketType.findAll);

            return we.db.Sequelize.Promise.all(fns);
          });
        },

        checkUserMaxToBuy: function checkUserMaxToBuy(etts) {
          var ettsData = this.ettsData;

          var identifiers = etts.map(function(ett){
            return ett.paymentLineIdentifier;
          });

          return we.db.models.payment_order_line.findAll({
            where: {
              orderLineIdentifier: identifiers
            },
            attributes: ['id', 'modelId'],
            raw: true
          })
          .then(function (orderLines) {
            // user dont have tickets of this types
            if (orderLines && orderLines.length) {
              if (we.db.models.eventTicketType.userHaveMaxForEachUser(orderLines, etts, ettsData)) {
                throw new Error('event.ticket.type.sb.maxForEachUser');
              }
            }

            return etts;
          })
        },

        /**
         * Check if one user are in max tickets items
         *
         * @param  {Array} orderLines
         * @param  {Object} etts
         * @return {Boolean}
         */
        userHaveMaxForEachUser: function userHaveMaxForEachUser(orderLines, etts, ettsData) {
          var ticketsCount = {};
          var i;
          // count every orderLine
          for (i = 0; i < orderLines.length; i++) {
            if (!ticketsCount[orderLines[i].modelId]) {
              ticketsCount[orderLines[i].modelId] = 1;
            } else {
              ticketsCount[orderLines[i].modelId]++;
            }
          }

          for (i = 0; i < etts.length; i++) {
            if (ticketsCount[etts[i].id]) {
              ticketsCount[etts[i].id] += Number(ettsData[etts[i].id]);

              if (etts[i].maxForEachUser <= ticketsCount[etts[i].id]) {
                return true;
              }
            }
          }

          return false;
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