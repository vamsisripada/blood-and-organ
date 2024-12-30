const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const port = 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true, 
}));

const admin = require('firebase-admin');
const serviceAccount = require('./keys.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('front');
});

app.get('/be', (req, res) => {
  res.render('be');
});

app.get('/get', (req, res) => {
  res.render('get');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/loginsubmit', (req, res) => {
  const email = req.body.EmailAddress;
  const password = req.body.Password;

  db.collection('users')
    .where('email', '==', email)
    .get()
    .then((docs) => {
      if (docs.empty) {
        res.send('Email not found. Please register first.');
      } else {
        const userDoc = docs.docs[0];
        const user = userDoc.data();
        bcrypt.compare(password, user.password, (err, result) => {
          if (err || !result) {
            res.send('Invalid password. Please try again.');
          } else {
            const loggedInUsername = user.name;
            res.render('donate', { loggedInUsername });
          }
        });
      }
    })
    .catch((error) => {
      res.send('Error: ' + error.message);
    });
});


app.post('/registersubmit', (req, res) => {
  const Username = req.body.Username;
  const email = req.body.EmailAddress;
  const password = req.body.Password;
  const repeat_password = req.body.RepeatPassword;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      res.send('Error: ' + err.message);
    } else {
      db.collection('users')
        .where('email', '==', email)
        .get()
        .then((docs) => {
          if (!docs.empty) {
            res.send('Email already registered. Please use a different email.');
          } else if (password === repeat_password) {
            db.collection('users')
              .add({
                name: Username,
                email: email,
                password: hash, 
              })
              .then(() => {
                req.session.loggedInUsername = Username;
                res.redirect('login');
              })
              .catch((error) => {
                res.send('Error: ' + error.message);
              });
          } else {
            res.send('Passwords do not match. Please try again.');
          }
        })
        .catch((error) => {
          res.send('Error: ' + error.message);
        });
    }
  });
});


app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/submit/plasma', (req, res) => {
    const { name, email, phone, bloodGroup, country, state, district, townCity } = req.body;
    const plasmaData = {
        name: name,  // Use an empty string if undefined
        email: email,
        phone: phone,
        bloodGroup: bloodGroup,
        country: country,
        state: state,
        district: district,
        townCity: townCity
    };
    const plasmaRef = db.collection('plasma');
    plasmaRef.add(plasmaData)
        .then(() => {
            res.send('Thankyou for filling the form');
        })
        .catch((error) => {
            res.send('Error: ' + error.message);
        });
});


app.post('/search/plasma', (req, res) => {
    const { bloodGroup, country, state, district, townCity } = req.body;
    const plasmaRef = db.collection('plasma');

    // Build a query to search the 'plasma' collection based on the provided criteria
    let query = plasmaRef;

    if (bloodGroup) {
        query = query.where('bloodGroup', '==', bloodGroup);
    }
    if (country) {
        query = query.where('country', '==', country);
    }
    if (state) {
        query = query.where('state', '==', state);
    }
    if (district) {
        query = query.where('district', '==', district);
    }
    if (townCity) {
        query = query.where('townCity', '==', townCity);
    }

    // Execute the query
    query.get()
        .then((snapshot) => {
            const results = [];
            snapshot.forEach((doc) => {
                results.push(doc.data());
            });
            // Convert the results to an HTML table
            const tableHtml = generateHTMLTable(results);
            // Send the HTML table as a response
            res.send(tableHtml);
        })
        .catch((error) => {
            res.status(500).json({ error: error.message });
        });
});

function generateHTMLTable(results) {
            if (results.length === 0) {
                return '<p>No results found.</p>';
            }

            let tableHtml = '<table class="styled-table"><thead><tr>';
            const keys = Object.keys(results[0]);
            keys.forEach((key) => {
                tableHtml += `<th>${key}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';

            results.forEach((result) => {
                tableHtml += '<tr>';
                keys.forEach((key) => {
                    tableHtml += `<td>${result[key]}</td>`;
                });
                tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            return tableHtml;
        }

app.post('/submit/blood', (req, res) => {
    const { name, email, phone, bloodGroup, country, state, district, townCity } = req.body;
    const bloodData = {
        name: name,  // Use an empty string if undefined
        email: email,
        phone: phone,
        bloodGroup: bloodGroup,
        country: country,
        state: state,
        district: district,
        townCity: townCity
    };
    const bloodRef = db.collection('blood'); // Assuming 'blood' is the name of your blood donor collection
    bloodRef.add(bloodData)
        .then(() => {
            res.send('Thank you for filling the form');
        })
        .catch((error) => {
            res.send('Error: ' + error.message);
        });
});

app.post('/search/blood', (req, res) => {
    const { bloodGroup, country, state, district, townCity } = req.body;
    const bloodRef = db.collection('blood'); // Assuming 'blood' is the name of your blood donor collection

    // Build a query to search the 'blood' collection based on the provided criteria
    let query = bloodRef;

    if (bloodGroup) {
        query = query.where('bloodGroup', '==', bloodGroup);
    }
    if (country) {
        query = query.where('country', '==', country);
    }
    if (state) {
        query = query.where('state', '==', state);
    }
    if (district) {
        query = query.where('district', '==', district);
    }
    if (townCity) {
        query = query.where('townCity', '==', townCity);
    }

    // Execute the query
    query.get()
        .then((snapshot) => {
            const results = [];
            snapshot.forEach((doc) => {
                results.push(doc.data());
            });
            // Convert the results to an HTML table
            const htmlTable = generateHTMLTable(results);
            res.send(htmlTable);
        })
        .catch((error) => {
            res.status(500).json({ error: error.message });
        });
});

app.post('/submit/organ', (req, res) => {
    const { name, email, phone, organType, bloodGroup, country, state, district, townCity } = req.body;
    const organData = {
        name: name,  // Use an empty string if undefined
        email: email,
        phone: phone,
        organType: organType,
        bloodGroup: bloodGroup,
        country: country,
        state: state,
        district: district,
        townCity: townCity
    };
    const organRef = db.collection('organ'); // Assuming 'organ' is the name of your organ donor collection
    organRef.add(organData)
        .then(() => {
            res.send('Thank you for filling the form');
        })
        .catch((error) => {
            res.send('Error: ' + error.message);
        });
});

app.post('/search/organ', (req, res) => {
    const { organType, bloodGroup, country, state, district, townCity } = req.body;
    const organRef = db.collection('organ'); // Assuming 'organ' is the name of your organ donor collection

    // Build a query to search the 'organ' collection based on the provided criteria
    let query = organRef;

    if (bloodGroup) {
        query = query.where('bloodGroup', '==', bloodGroup);
    }
    if (organType) {
        query = query.where('organType', '==', organType);
    }
    if (country) {
        query = query.where('country', '==', country);
    }
    if (state) {
        query = query.where('state', '==', state);
    }
    if (district) {
        query = query.where('district', '==', district);
    }
    if (townCity) {
        query = query.where('townCity', '==', townCity);
    }

    // Execute the query
    query.get()
        .then((snapshot) => {
            const results = [];
            snapshot.forEach((doc) => {
                results.push(doc.data());
            });
            // Convert the results to an HTML table
            const htmlTable = generateHTMLTable(results);
            res.send(htmlTable);
        })
        .catch((error) => {
            res.status(500).json({ error: error.message });
        });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});