var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var _, http, we, async, ett;
var crypto = require('crypto');

describe('tickettypeFeature', function () {
  var cf, salvedUser, salvedUserPassword;
  var authenticatedRequest;

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    _ = we.utils._;
    async = we.utils.async;

    async.series([
      function (done) {
        var userStub = stubs.userStub();
        helpers.createUser(userStub, function(err, user) {
          if (err) throw err;

          salvedUser = user;
          salvedUserPassword = userStub.password;

          // login user and save the browser
          authenticatedRequest = request.agent(http);
          authenticatedRequest.post('/login')
          .set('Accept', 'application/json')
          .send({
            email: salvedUser.email,
            password: salvedUserPassword
          })
          .expect(200)
          .set('Accept', 'application/json')
          .end(function (err) {
            if (err) throw err;

            done();
          });

        });
      },
      function(done) {
        we.db.models.event.create({
          abbreviation: 'CIPSSP-'+ (new Date().getTime()),
          title: 'V CONGRESSO INTERNACIONAL DE PEDAGOGIA SOCIAL E SIMPÓSIO DE PÓS-GRADUAÇÃO',
          about: 'Os Congressos Internacionais de Pedagogia Social (CIPS) são organizados pelo Grupo de Pesquisa Pedagogia Social, da Faculdade de Educação da USP, a Associação Brasileira de Pedagogia Social (ABRAPSocial) e pelas instituições de ensino superior e grupos de pesquisas nomeados neste regulamento e constituem espaços de discussão, de reflexão, de articulação e de avaliação das práticas de Educação Social, popular e comunitária que têm a Pedagogia Social como principal referencial teórico e metodológico.',
          email: 'contato@albertosouza.net',
          location: 'Brasil, Rio de Janeiro',
          latitude: '-22.905412',
          longitude: '-43.1732707',
          tags: ['educação', 'saúde'],
          callForPapersStartDate: new Date(),
          callForPapersEndDate: new Date((new Date()).getTime() + (8 * 86400000)),
          eventStartDate: new Date((new Date()).getTime() + (8 * 86400000)),
          eventEndDate: new Date((new Date()).getTime() + (10 * 86400000)),
          published: true
        })
        .then(function after(r) {
          cf = r;
          done();
        })
        .catch(done);
      },
      function(done) {
        we.db.models.eventTicketType.create({
          name: '1 Lote',
          price: 2,
          description: '1 lote barato',
          maxForEachUser: 1,
          amount: 1,
          startDate: new Date(),
          endDate: new Date((new Date()).getTime() + (10 * 86400000)),
          eventId: cf.id
        })
        .then(function (r){
          ett = r;
          done();
        })
        .catch(done);
      }
    ], done);
  });

  describe('ticket buy', function () {
    beforeEach(function(done){

      console.log('rodo')

      we.utils.async.series([
        function(done) {
          we.db.models.payment_order_line.destroy({
            where: { id: { $gt: 0 } }
          })
          .then(function(){ done(); })
          .catch(done);
        },
        function(done) {
          we.db.models.payment_order.destroy({
            where: { id: { $gt: 0 } }
          })
          .then(function(){ done(); })
          .catch(done);
        },
        function(done) {
          we.db.models.eventTicketType.update({
            sold: 0
          }, {
            where: { id: ett.id }
          }).then(function(){
            done();
          }).catch(done);
        }
      ], done);
    });

    it('user should buy one ticket without concurrency', function(done) {
      var data = {};

      data['qt_ett_'+ett.id] = 1;

      authenticatedRequest
      .post('/event/'+cf.id+'/ticket/buy/start')
      .send(data)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.error(res.text);
          return done(err);
        }

        done();
      });
    });

    it('user should do rollback and return event.ticket.type.sb.sold_out error', function(done) {
      var data = {};

      data['qt_ett_'+ett.id] = 1;

      we.utils.async.parallel([
        function (done) {
          authenticatedRequest
          .post('/event/'+cf.id+'/ticket/buy/start')
          .send(data)
          .expect(302)
          .end(function (err, res) {
            if (err) {
              console.error(res.text);
              return done(err);
            }

            // console.log('<<', res.status, err, res.body);

            done();
          });
        },

        function (done) {
          authenticatedRequest
          .post('/event/'+cf.id+'/ticket/buy/start')
          .send(data)
          .expect(302)
          .end(function (err, res) {
            if (err) {
              console.error(res.text);
              return done(err);
            }

            // console.log('<<2', res.status, err, res.body);

            done();
          });
        }
      ], function(err) {
        if (err) {
          return done(err);
        }

        done();
      });

    });
  });
  describe('create', function () {
    it('post /tickettype create one tickettype record');
  });
  describe('findOne', function () {
    it('get /tickettype/:id should return one tickettype');
  });
  describe('update', function () {
    it('put /tickettype/:id should upate and return tickettype');
  });
  describe('destroy', function () {
    it('delete /tickettype/:id should delete one tickettype')
  });
});
