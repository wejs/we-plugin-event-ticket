window.addEventListener('WebComponentsReady', function() {
  var we = window.we;
  /**
   * Event price field
   */
  var WeEventPriceFieldProt = Object.create(HTMLInputElement.prototype);

  WeEventPriceFieldProt.createdCallback = function createdCallback() {
    this.style = 'text-align: right;';
    this.type = 'text';

    var size = this.dataset.size;
    if (size) {
      size++;
    } else {
      size = 10;
    }

    $(this).priceFormat({
      prefix: '',
      thousandsSeparator: '',
      clearPrefix: true,
      limit: size,
      centsLimit: 2
    });
  }
  document.registerElement('we-event-price-field', {
    prototype: WeEventPriceFieldProt,
    extends: 'input'
  });


  /**
   * Event registration types selector
   */
  var WeEventTicketTypeProt = Object.create(HTMLElement.prototype);
  WeEventTicketTypeProt.createdCallback = function createdCallback() {
    var self = this;

    this.addEventListener('eventTicketType:created', function (ev) {
      ev.preventDefault();

      var data = ev.detail.eventTicketType;

      var trs = self.querySelectorAll('tr');
      for (var i = trs.length - 1; i >= 0; i--) {
        // element already are in dom then skip
        if (trs[i].dataset.id == data.id) return;
      }

      self.querySelector('tbody').innerHTML += self.renderLine(data);
      return false;
    });

    this.addEventListener('submit', function(ev){
      ev.preventDefault();
    }, false);

    this.showLoading();

    this.getTypesData(function (data){
      self.typesData = data.eventTicketType;
      self.renderTable();
      self.hideLoading();
    });

    this.addEventListener('we:modal:form:submit:success', this.onCreateNewItem);
  }
  WeEventTicketTypeProt.onCreateNewItem = function (ev){
    if (ev.defaultPrevented) return;
    ev.preventDefault();

    this.querySelector('tbody').innerHTML +=  this.renderLine(ev.detail.eventTicketType);

    return false;
  }

  WeEventTicketTypeProt.showLoading = function() {

  }
  WeEventTicketTypeProt.hideLoading = function() {

  }
  WeEventTicketTypeProt.getTypesData = function(cb) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4 ) {
        if (xhttp.status == 200) {
          cb( JSON.parse(xhttp.responseText) );
        } else {
          cb();
        }
      }
    };
    xhttp.open('GET', '/event/'+this.dataset.eventId+'/admin/ticket/type.json', true);
    xhttp.send();
  }
  WeEventTicketTypeProt.renderTable = function renderTable() {
    var i;
    var html = '<table class="table">'+
      '<thead><tr>'+
        '<th>'+this.dataset.labelName+'</th>'+
        '<th>'+this.dataset.labelPrice+'</th>'+
        '<th>'+this.dataset.labelPeriod+'</th>'+
        '<th>'+this.dataset.labelDescription+'</th>'+
        '<th>'+this.dataset.labelActions+'</th>'+
      '</tr></thead>'+
      '<tbody>';

        if (this.typesData) {
          for (i = this.typesData.length - 1; i >= 0; i--) {
            html += this.renderLine(this.typesData[i]);
          }
        }

    html += '</tbody><tfoot><tr><td colspan="5">'+
      '<we-overlay-form-btn class="btn btn-default" data-url="/event/'+this.dataset.eventId+
          '/admin/ticket/type/create?contentOnly=true">'+
          this.dataset.labelCreate+
      '</we-overlay-form-btn>'+
    '</tr></td></tfoot></table>';

    this.innerHTML = html;
  }
  WeEventTicketTypeProt.renderLine = function renderLine(data) {
    var lineClass = '';
    if (!data) {
      lineClass += ' create';
      data = {};
    } else {
      lineClass += ' salved';
    }

    var d;
    if (data.startDate) {
      d = new Date(data.startDate);
      data.startDate = window.moment(d.toISOString()).format(this.dataset.dateformat);
    }

    if (data.endDate) {
      d = new Date(data.endDate);
      data.endDate = window.moment(d.toISOString()).format(this.dataset.dateformat);
    }

    return '<tr is="we-event-rts-item" class="'+lineClass+'" '+
      ' data-id="'+ ( data.id || '' ) +'"'+
      ' data-name="'+we.utils.sanitize(data.name || '')+'"'+
      ' data-price="'+we.utils.sanitize( Number(data.price).toFixed(2) || 0 )+'"'+
      ' data-description="'+we.utils.sanitize( data.description || '' )+'"'+
      ' data-start-date="'+ (data.startDate || '') +'"'+
      ' data-end-date="'+ (data.endDate || '') +'"'+
      ' data-event-id="'+ this.dataset.eventId +'"'+
      '"'+
    '></tr>';
  }
  document.registerElement('we-event-ticket-types-selector', {
    prototype: WeEventTicketTypeProt,
  });

  /**
   * CF(event) RegistrationType selector item element
   */
  var WeEventRegistrationTypeProt = Object.create(HTMLTableRowElement.prototype);

  WeEventRegistrationTypeProt.createdCallback = function createdCallback() {
    this.renderContent();

    this.addEventListener('click', this.removeCFRT, false);
    this.addEventListener('we:modal:form:submit:success', this.onUpdate);
  }

  WeEventRegistrationTypeProt.onUpdate = function onUpdate(ev) {
    if (ev.defaultPrevented) return;
    ev.preventDefault();

    var data = ev.detail.eventTicketType;
    var d;
    if (data.startDate) {
      d = new Date(data.startDate);
      data.startDate = window.moment(d.toISOString()).format(this.CRFTSelector.dataset.dateformat);
    }

    if (data.endDate) {
      d = new Date(data.endDate);
      data.endDate = window.moment(d.toISOString()).format(this.CRFTSelector.dataset.dateformat);
    }

    this.dataset.name = data.name;
    this.dataset.price = data.price;
    this.dataset.description = (data.description || '');
    this.dataset.startDate = (data.startDate || '');
    this.dataset.endDate = (data.endDate || '');

    this.renderContent();

    return false;
  }

  WeEventRegistrationTypeProt.renderContent = function renderContent() {
    var data = this.dataset;

    if (!data.price) data.price = 0;

    this.CRFTSelector = this.parentElement.parentElement.parentElement;

    var eventId = this.CRFTSelector.dataset.eventId;

    var labelRemove = this.CRFTSelector.dataset.labelRemove;
    var labelBtn = ((data.id) ? this.CRFTSelector.dataset.labelEdit: this.CRFTSelector.dataset.labelCreate );

    this.innerHTML =
    '<td>'+we.utils.sanitize(data.name || '')+'</td>'+
    '<td>'+we.utils.sanitize( Number(data.price).toFixed(2) || 0 ) +'</td>'+
    '<td>'+
      '<div>'+(data.startDate || '')+'</div>'+
      '<div>'+(data.endDate || '')+'</div>'+
    '</td>'+
    '<td class="cfrt-f-description">'+we.utils.sanitize( data.description || '' )+'</td>'+
    '<td class="cfrt-f-actions">'+
      '<we-overlay-form-btn class="btn btn-default" data-url="/event/'+eventId+
          '/admin/ticket/type/'+data.id+
          '/edit?contentOnly=true">'+
        labelBtn+
      '</we-overlay-form-btn>'+
      ((data.id) ? '<button class="btn btn-default" name="remove" type="button" class="btn-cfrt-remove">'+labelRemove+
      '</button>': '' ) +
    '</td>';
  }

  WeEventRegistrationTypeProt.startLoading = function startLoading() {
    this.querySelector('input[name=name]').disabled = 'disabled';
    this.querySelector('input[name=price]').disabled = 'disabled';
    this.querySelector('textarea').disabled = 'disabled';
    this.querySelector('button').disabled = 'disabled';
  }

  WeEventRegistrationTypeProt.endLoading = function endLoading() {
    this.querySelector('input[name=name]').removeAttribute('disabled');
    this.querySelector('input[name=price]').removeAttribute('disabled');
    this.querySelector('textarea').removeAttribute('disabled');
    this.querySelector('button').removeAttribute('disabled');
  }

  WeEventRegistrationTypeProt.resetForm = function resetForm () {
    this.querySelector('input[name=name]').value = '';
    this.querySelector('input[name=price]').value = 0;
    this.querySelector('textarea').value = '';
    this.querySelector('input[name=startDate]').value = '';
    this.querySelector('input[name=endDate]').value = '';
  }

  WeEventRegistrationTypeProt.removeCFRT = function removeCFRT(event) {
    if (event.target.name != 'remove') return;
    event.preventDefault();

    if (!confirm(this.CRFTSelector.dataset.messageRemove)) return;

    var self = this;

    $.ajax({
      url: '/event/'+this.dataset.eventId+'/admin/ticket/type/'+this.dataset.id+'/delete',
      method: 'POST',
      headers: { Accept: 'application/json' }
    }).then(function () {
      self.parentNode.removeChild(self);
    }).fail(function(err) {
      console.error(err);
    });
  }
  document.registerElement('we-event-rts-item', {
    prototype: WeEventRegistrationTypeProt,
    extends: 'tr'
  });
});