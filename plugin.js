/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/plugin
 */
module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);

  plugin.setConfigs({
    forms: {
      'event-ticketTypes': __dirname + '/server/forms/event-ticketTypes.json'
    }
  });

  plugin.setRoutes({
    'get /event/:eventId/admin/ticket/type': {
      name: 'event.admin.ticket.type',
      controller: 'eventTicketType',
      action: 'find',
      model: 'eventTicketType',
      permission: 'manage_event',
      titleHandler : 'i18n',
      titleI18n: 'event.admin.ticket.type',
      layoutName: 'eventAdmin',
      template: 'admin/eventTicketType/find',
      breadcrumbHandler: function (req, res, done) {
        if (!res.locals.event) return done();

        res.locals.breadcrumb =
          '<ol class="breadcrumb">'+
            '<li><a href="/">'+res.locals.__('Home')+'</a></li>'+
            '<li><a href="/event">'+res.locals.__('event.find')+'</a></li>'+
            '<li><a href="/event/'+res.locals.event.id+'">'+
              req.we.utils.string(res.locals.event.title || '').truncate(25).s+
            '</a></li>'+
            '<li class="active">'+res.locals.title+'</li>'+
          '</ol>';
        done();
      }
    },
    'get /event/:eventId/admin/ticket/type/create': {
      name: 'event.admin.ticket.create',
      controller: 'eventTicketType',
      action: 'create',
      model: 'eventTicketType',
      permission: 'manage_event',
      titleHandler : 'i18n',
      titleI18n: 'event.admin.ticket.type.create',
      layoutName: 'eventAdmin',
      template: 'admin/eventTicketType/form'
    },
    'post /event/:eventId/admin/ticket/type/create': {
      controller: 'eventTicketType',
      action: 'create',
      model: 'eventTicketType',
      permission: 'manage_event',
      titleHandler : 'i18n',
      titleI18n: 'event.admin.ticket.type.create',
      layoutName: 'eventAdmin',
      template: 'admin/eventTicketType/form'
    },
    'get /event/:eventId/admin/ticket/type/:eventTicketTypeId/edit': {
      name: 'event.admin.ticket.edit',
      controller: 'eventTicketType',
      action: 'edit',
      model: 'eventTicketType',
      permission: 'manage_event',
      titleHandler : 'i18n',
      titleI18n: 'event.admin.ticket.type.edit',
      layoutName: 'eventAdmin',
      template: 'admin/eventTicketType/form'
    },
    'post /event/:eventId/admin/ticket/type/:eventTicketTypeId/edit': {
      controller: 'eventTicketType',
      action: 'edit',
      model: 'eventTicketType',
      permission: 'manage_event',
      titleHandler : 'i18n',
      titleI18n: 'event.admin.ticket.type.edit',
      layoutName: 'eventAdmin',
      template: 'admin/eventTicketType/form'
    },
    'post /event/:eventId/admin/ticket/type/:eventTicketTypeId/delete': {
      controller: 'eventTicketType',
      action: 'delete',
      model: 'eventTicketType',
      permission: 'manage_event',
      titleHandler : 'i18n',
      titleI18n: 'event.admin.ticket.type.delete',
      responseType: 'json'
    },
    'post /event/:eventId/ticket/buy/start': {
      controller: 'eventTicketType',
      action: 'startBuy',
      model: 'eventTicketInvoice',
      permission: 'find_event',
      responseType: 'json'
    },

    'get /event/:eventId/ticket/buy/set-names': {

    },

    'post /event/:eventId/ticket/buy/set-names': {

    },

    'get /event/:eventId/ticket/buy/add-payment-method': {

    },

    'post /event/:eventId/ticket/buy/add-payment-method': {

    }
  })

  plugin.setResource({
    parent: 'event',
    name: 'eventTicketType',
    namespace: '/admin',
    layoutName: 'eventAdmin',
    // create: { breadcrumbHandler: 'admineventTicketTypeCreate' },
    // findOne: { breadcrumbHandler: 'admineventTicketTypeFindOne' },
    // edit: { breadcrumbHandler: 'admineventTicketTypeFindOne' },
    // delete: { breadcrumbHandler: 'admineventTicketTypeFindOne' },
    // findAll: { breadcrumbHandler: 'admineventTicketTypeFind' }
  });

  plugin.hooks.on('we-plugin-event:extend:event:admin:menu', function(data, done){
    data.res.locals.eventAdminMenu.addLinks([
      {
        id: 'event.admin.ticket.type',
        text: '<i class="fa fa-ticket"></i> '+data.req.__('event.admin.ticket.type'),
        href: '/event/'+data.res.locals.event.id+'/admin/ticket/type',
        class: null,
        weight: 4,
        name: 'event.admin.ticket.type'
      },
      {
        id: 'event.admin.ticket',
        text: '<i class="fa fa-ticket"></i> '+data.req.__('event.admin.ticket'),
        href: '/event/'+data.res.locals.event.id+'/admin/ticket',
        class: null,
        weight: 6,
        name: 'event.admin.ticket'
      }
    ]);

    done();
  });

  plugin.hooks.on('we-plugin-event:before:send:event', function(data, done) {
    if (!data.res.locals.event) return done();
    data.req.we.utils.async.series([
      function userEventTicketInvoices(done) {
        if (!data.req.isAuthenticated()) return done();

        data.req.we.db.models.eventTicketInvoice.findAll({
          where: { ownerId: data.req.user.id }
        })
        .then(function(r){
          data.res.locals.metadata.eventTicketInvoices = r;
          done();
        }).catch(done);
      },
      function loadUserTickets(done) {
        if (!data.req.isAuthenticated()) return done();

        data.req.we.db.models.ticket.findAll({
          where: { ownerId: data.req.user.id }
        })
        .then(function(r){
          data.res.locals.metadata.userTickets = r;
          done();
        }).catch(done);
      },
      function loadAllTIckets(done) {
        data.req.we.db.models.eventTicketType.findAll()
        .then(function(r){
          data.res.locals.metadata.eventTicketTypes = r;
          done();
        }).catch(done);
      },
      function checkLimits(done) {
        // console.log('>>', data.res.locals.metadata);
        data.res.locals.ticketsSelectorTemplate = 'ticket/selector/empty'

        if (
          data.res.locals.metadata.eventTicketTypes &&
          data.res.locals.metadata.eventTicketTypes.length > 1
        ) {
          data.res.locals.ticketsSelectorTemplate = 'ticket/selector/multiple';
        } else if (
          data.res.locals.metadata.eventTicketTypes &&
          data.res.locals.metadata.eventTicketTypes.length == 1
        ) {
          data.res.locals.ticketsSelectorTemplate = 'ticket/selector/single';
        } else {

        }

        done();
      }
    ], done);
  });

  plugin.addJs('we-plugin-event-ticket', {
    type: 'plugin', weight: 10, pluginName: 'we-plugin-event-ticket',
    path: 'files/public/we-plugin-event-ticket.js'
  });
  plugin.addCss('we-plugin-event-ticket', {
    type: 'plugin', weight: 10, pluginName: 'we-plugin-event-ticket',
    path: 'files/public/we-plugin-event-ticket.css'
  });

  return plugin;
};