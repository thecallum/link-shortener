const expect = require('expect');
const request = require('supertest');
const bcrypt = require('bcrypt');

process.env.TESTING = true;

const { app } = require('../../../server/server');

const con = require('../../../server/db/connection');

const insertUser = require('../utils/insertUser');
const insertLink = require('../utils/insertLink');
const resetUserTable = require('../utils/resetUserTable')
const resetLinkTable = require('../utils/resetLinkTable')

const encodeURL = require('../../../server/utils/encodeURL');

const login = require('../utils/login');

describe('POST /link', () => {
    const email = 'email@email.com';
    const password = 'password1234';
    const hash = bcrypt.hashSync(password, 10);

    const link = 'https://github.com/CallumM1999/link-shortener/blob/master/README.md';
    const label = 'Github';

    let cookie;

    before(() => new Promise(async resolve => {
        // reset tables;
        await resetLinkTable();
        await resetUserTable();

        // create user
        await insertUser(email, hash);

        // login
        cookie = await login(email, password);

        resolve();
    }));


    it('should add new link', done => {
        request(app)
            .post('/link')
            .send({ link, label })
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(200);

                const query = `SELECT * FROM link WHERE link='${link}';`;

                con.query(query, (err, res) => {
                    expect(res[0].label).toEqual(label)
                    done();
                })
            })
    })

    it('should 400 (no label)', done => {
        request(app)
            .post('/link')
            .send({ link })
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(400);
                done();
            })
    });

    it('should 400 (label too long)', done => {
        request(app)
            .post('/link')
            .send({ link, label: ('a').repeat(31) })
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(400);
                done();
            })
    })

    it('should 400 (no link)', done => {
        request(app)
            .post('/link')
            .send({ label })
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(400);
                done();
            })
    })

    it('should 400 (invalid link)', done => {
        request(app)
            .post('/link')
            .send({ link: 'ajsdnajsdn', label })
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(400);
                done();
            })
    })

    it('should 400 (link without protocol)', done => {
        request(app)
            .post('/link')
            .send({ link: 'google.com', label })
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(400);
                done();
            })
    })
});

describe('GET /link', () => {
    const email = 'email@email.com';
    const password = 'password1234';
    const hash = bcrypt.hashSync(password, 10);

    const fullURL = 'https://github.com/CallumM1999/link-shortener/blob/master/README.md';
    let userID;
    const label = 'Github';
    const iconURL = 'http://github.com/favicon.icon';

    let cookie;

    before(async () => {
        // reset tables;
        await resetLinkTable();
        await resetUserTable();

        // create user
        const user = await insertUser(email, hash);
        userID = user.insertId;

        // login
        cookie = await login(email, password);

        // insert a link
        await insertLink(fullURL, userID, label, iconURL)

    });

    it('get link', done => {
        request(app)
            .get('/link')
            .set('Cookie', [cookie])
            .then(response => {
                expect(response.status).toBe(200);

                const query = `SELECT * FROM link WHERE userID = '${userID}'`;

                con.query(query, (err, links) => {
                    if (err) done(err);

                    expect(links[0].link).toEqual(fullURL);
                    expect(links[0].label).toEqual(label)
                    expect(links[0].icon).toEqual(iconURL);

                    done();
                })

            }).catch(e => done(e));
    })





});

describe('GET /link/:encodedURL', () => {
    const email = 'email@email.com';
    const password = 'password1234';
    const hash = bcrypt.hashSync(password, 10);
    let userID;

    const fullURL = 'https://github.com/CallumM1999/link-shortener/blob/master/README.md';
    const label = 'Github';
    const iconURL = 'http://github.com/favicon.icon';
    let linkID;
    let linkEncodedURL;

    // let cookie;

    before(() => new Promise(async resolve => {
        // reset tables;
        await resetLinkTable();
        await resetUserTable();

        // create user
        const user = await insertUser(email, hash);
        userID = user.insertId;


        // login
        // cookie = await login(email, password);

        // insert a link
        const insertedLink = await insertLink(fullURL, userID, label, iconURL)
        linkID = insertedLink.insertId;

        linkEncodedURL = encodeURL(linkID);

        resolve();
    }));

    it('should redirect', done => {
        request(app)
            .get(`/link/${linkEncodedURL}`)
            .then(response => {
                expect(response.status).toEqual(302); // supertest recieves 302? something to do with redirect

                const query = `SELECT * FROM link WHERE userID = ${userID};`;

                con.query(query, (err, res) => {
                    if (err) done(err);
                    expect(res[0].link).toEqual(response.header.location)
                    expect(res[0].label).toEqual(label);
                    done();
                })
            }).catch(e => done(e));
    });

    it('should 404 (link doesnt exsist)', done => {
        request(app)
            .get(`/link/bbbbbb`)
            .then(response => {
                expect(response.status).toEqual(404);

                done();
            }).catch(e => done(e));
    });


})