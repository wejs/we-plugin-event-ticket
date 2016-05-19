module.exports = {
  startBuy: function startBuy(req, res) {
    if (!res.locals.event) return res.notFound('eventTicketType.event.not.found');

    if (!req.isAuthenticated) return res.forbidden();

    var we = req.we;
    var ettsData = we.db.models.eventTicketType.getIdsFromBody(req.body);

    if (!ettsData) {
      res.addMessage('error', {
        text: 'event.ticket.type.sb.not_found'
      });
      return res.goTo('/event/'+res.locals.event.id);
    }

    we.db.models.eventTicketType.findAll({
      where: {
        id: Object.keys(ettsData),
        eventId: res.locals.event.id
      }
    })
    .then(we.db.models.eventTicketType.checkUserMaxToBuy.bind({
      req: req, res: res, ettsData: ettsData
    }) )
    .then(function afterFindTicketTypes(etts) {
      if (!etts || !etts.length) {
        throw new Error('event.ticket.type.sb.not_found');
      }
      // 1- check if all ticket type is avaible
      for (var i = 0; i < etts.length; i++) {
        if (etts[i].ticketsAvaibleCount < 1) {
          throw new Error('event.ticket.type.sb.sold_out');
        }
      }
      // 2- start the create payment order process
      return we.db.models.eventTicketType.makeInvoice({
        ettsData: ettsData, eventTicketType: etts, event: res.locals.event
      }, req.user).then(function afterMakeTheOrders(orders) {

        res.locals.data = orders;
        res.goTo('/event/'+res.locals.event.id);

      });
    })
    .catch(function onError(err) {

      switch(err.message) {
        case 'event.ticket.type.sb.maxForEachUser':
          res.addMessage('error', 'event.ticket.type.sb.maxForEachUser');
          break;
        case 'event.ticket.type.sb.sold_out':
          res.addMessage('error', 'event.ticket.type.sb.sold_out');
          break;
        case 'event.ticket.type.sb.not_found':
          res.addMessage('error', 'event.ticket.type.sb.not_found');
          break;
        default:
          return res.queryError(err);
      }

      if (req.accepts('json')) {
        res.badRequest();
      } else {
        res.goTo('/event/'+res.locals.event.id);
      }
    });
  }
};