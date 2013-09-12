var mongooseCachebox = require('../');
var mongoose = require('mongoose');
var expect = require('expect.js');
var Schema = mongoose.Schema;

var names = ["Jacob", "Sophia", "Mason", "Isabella", "William", "Emma", "Jayden", "Olivia", "Noah", "Ava", "Michael", "Emily", "Ethan", "Abigail", "Alexander", "Madison", "Aiden", "Mia", "Daniel", "Chloe"];

// connecting to mongoose
mongoose.connect('mongodb://localhost/mongoose-cachebox-test-t');

// adding mongoose cachebox
mongooseCachebox(mongoose, { engine: 'memory' });

var PeopleSchema = new Schema({
  name: String,
  date: {
    type: String,
    "default": Date.now()
  },
  num: Number,
  test: Boolean
});

var People = mongoose.model('People', PeopleSchema);

function generate (amount, fn) {
  var crowd = [];
  var count = 0;
  while (count < amount) {
    crowd.push({
      name: names[Math.floor(Math.random() * names.length)],
      num: Math.random() * 10000
    });
    count++;
  }
  People.create(crowd, fn);
}

//generate(10, function () {});

describe('mongooseCachebox', function () {

  beforeEach(function(done){
    generate(10, done);
  });

  afterEach(function(done){
    People.remove(done);
  });

  it('should have `cache` method', function () {
    expect(People.find({}).cache).to.be.a('function');
  });

  it('should not cache query if `cache` method is not called', function (done) {
    People.find({}).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
          expect(docs.stored).to.be(undefined);
          expect(docs.ttl).to.be(undefined);
          done();
        }
      });
    });
  });

  it('should cache query if the `cache` method is called', function (done) {
    People.find({}).cache().exec(function (err, docs) {
      if (err) return done(err);
      setTimeout(function () {
        People.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(docs.stored).to.be.a('number');
            expect(docs.ttl).to.be.a('number');
            expect(docs.ttl).to.be.within(50000, 59999);
            done();
          }
        });
      }, 2);
    });
  });

  it('should work with lean enabled', function (done) {
    People.find({}).lean().cache().exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
          expect(docs.stored).to.be.a('number');
          expect(docs.ttl).to.be.a('number');
          done();
        }
      });
    });
  });

  it('should cache query with specific ttl if passed to `cache` method', function (done) {
    People.find({}).cache(60).exec(function (err, docs) {
      if (err) return done(err);
      setTimeout(function () {
        People.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(docs.stored).to.be.a('number');
            expect(docs.ttl).to.be.a('number');
            expect(docs.ttl).to.be.within(0, 59);
            done();
          }
        });
      }, 2);
    });
  });

  it('should cache query with specific ttl if passed to `ttl` method', function (done) {
    People.find({}).cache().ttl(60).exec(function (err, docs) {
      if (err) return done(err);
      setTimeout(function () {
        People.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(docs.stored).to.be.a('number');
            expect(docs.ttl).to.be.a('number');
            expect(docs.ttl).to.be.within(0, 59);
            done();
          }
        });
      }, 2);
    });
  });

  it('should stop caching', function (done) {
    People.find({}).cache().exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).cache(false).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
          expect(docs.stored).to.be(undefined);
          expect(docs.ttl).to.be(undefined);
          done();
        }
      });
    });
  });

  it('should cache all queries by setting cache property to true on the schema', function (done) {
    var ModelSchema = new Schema({ field: String });
    var Model = mongoose.model('A', ModelSchema);
    ModelSchema.set('cache', true);
    Model.create([{ field: 'a' }, { field: 'b' }, { field: 'c' }], function () {
      Model.find({}).exec(function (err, docs) {
        if (err) return done(err);
        Model.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(docs.stored).to.be.a('number');
            expect(docs.ttl).to.be.a('number');
            Model.remove();
            done();
          }
        });
      });
    });
  });

  it('should allow setting default ttl from schema', function (done) {
    var ModelSchema = new Schema({ a: String, b: Number });
    var Model = mongoose.model('B', ModelSchema);

    ModelSchema.set('cache', true);
    ModelSchema.set('ttl', 1000);

    Model.create([{ a: 'a', b: 1 }, { a: 'b', b: 1 }, { a: 'c', b: 1 }], function () {
      Model.find({ a: 'a'}, function (err, docs) {
        if (err) return done(err);
        Model.find({ a: 'a'}, function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(docs.stored).to.be.a('number');
            expect(docs.ttl).to.be.a('number');
            expect(docs.ttl).to.be.within(0, 1000);
            Model.remove();
            done();
          }
        });
      });
    });
  });

  after(function(done){
    mongoose.disconnect();
    done();
  });

});

