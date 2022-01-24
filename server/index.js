const express = require('express');
const { sha256 } = require("ethereum-cryptography/sha256");
// todo: shouldn't need this
const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const app = express();
const cors = require('cors');
const port = 3042;

// localhost can have cross origin errors
// depending on the browser you use!
app.use(cors());
app.use(express.json());

// const balances = {
//   "1": 100,
//   "2": 50,
//   "3": 75,
// }

const ec = new EC('secp256k1');

function verifyTransaction(txData, publicKey, signature) {
  /*
  privateKey: '4f7796ae64186bdeef41f213e0bf714f7dbe4c02050b53578d32190b59d325ed',
  publicX: 'd8fd36ecf0b39b0cbdf1cc50193a0ba8025cc40953e92ee5846e13f0a0de7f15',
  publicY: 'd1cf95bea002f3b5bd1d7807fbc009ca5aba692b9af4a55fb7a0c5aad7ce7884',
  */
  // publicKey = {
  //   x: "d8fd36ecf0b39b0cbdf1cc50193a0ba8025cc40953e92ee5846e13f0a0de7f15",
  //   y: "d1cf95bea002f3b5bd1d7807fbc009ca5aba692b9af4a55fb7a0c5aad7ce7884"
  // };
  let errors = [];
  // total amount in network must be the same before and after proposed transaction
  // sender must not spend more than they have
  if ((balances[txData.sender] -= txData.amount) < 0) {
    errors.push("Sender must not spend more money than they have!");
  }
  const key = ec.keyFromPublic(txData.sender, 'hex');
  const msgHash = SHA256(txData).toString();
  if (!key.verify(msgHash, signature))
    errors.push("Transaction signature was invalid!"); 
  return errors;  
}

function processTransaction(sender, recipient, amount) {
  const amt = Number(amount);
  balances[sender] -= amt;
  balances[recipient] += amt;
}

let balances = {};
let moneySupply = 0;
for (let i = 0; i < 3; i++) {
  const key = ec.genKeyPair();
  const publicKey = key.getPublic().encode('hex');
  balances[publicKey] = 10*i+50;
  moneySupply += balances[publicKey];
  console.log({
    privateKey: key.getPrivate().toString(16),
    publicX: key.getPublic().x.toString(16),
    publicY: key.getPublic().y.toString(16),
    public: publicKey
  });
}

app.get('/balances', (req, res) => {  
  res.send({ balances: balances, moneySupply: moneySupply });
});

app.get('/balance/:address', (req, res) => {  
  const {address} = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post('/send', (req, res) => {
  const {sender, recipient, amount} = req.body.txData;
  const signature = req.body.signature;
  const errors = verifyTransaction(req.body.txData, sender, signature);  
  const isValid = errors.length === 0;
  if (isValid) {
    processTransaction(sender, recipient, amount);
  }
  res.send({ txIsValid: isValid, errors: errors, balance: balances[sender] });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});
