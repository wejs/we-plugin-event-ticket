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
    }).then(function (etts) {
      if (!etts || !etts.length) {
        throw new Error('event.ticket.type.sb.not_found');
      }

      for (var i = 0; i < etts.length; i++) {
        if (etts[i].ticketsAvaibleCount < 1) {
          throw new Error('event.ticket.type.sb.sold_out');
        }
      }

      return we.db.models.eventTicketType.makeInvoice({
        ettsData: ettsData, eventTicketType: etts, event: res.locals.event
      }, req.user).then(function afterMakeTheOrders(orders) {
        res.locals.data = orders;

        res.goTo('/event/'+res.locals.event.id);
      });
    }).catch(function onError(err){
      if (err.message == 'event.ticket.type.sb.sold_out') {
        res.addMessage('warn', 'event.ticket.type.sb.sold_out');
        return res.goTo('/event/'+res.locals.event.id);
      } else if(err.message == 'event.ticket.type.sb.not_found') {
        res.addMessage('error', {
          text: 'event.ticket.type.sb.not_found'
        });
        return res.goTo('/event/'+res.locals.event.id);
      } else {
        return res.queryError(err);
      }
    });
  }
};