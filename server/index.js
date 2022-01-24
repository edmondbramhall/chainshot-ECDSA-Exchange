const express = require('express');
// todo: shouldn't need two sha256 references I expect
const { sha256 } = require("ethereum-cryptography/sha256");
const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const app = express();
const cors = require('cors');
const port = 3042;

// localhost can have cross origin errors
// depending on the browser you use!
app.use(cors());
app.use(express.json());

const ec = new EC('secp256k1');

function verifyTransaction(txData, signature, publicKey) {
  let errors = [];
  // total amount in network must be the same before and after proposed transaction
  // sender must not spend more than they have
  let senderBalance = balances[txData.sender]; 
  if ((senderBalance -= txData.amount) < 0) {
    errors.push("Sender must not spend more money than they have!");
  }
  const key = ec.keyFromPublic(publicKey, 'hex');
  const serverIdFromKey = getServerIdFromPublicKey(publicKey); 
  if (txData.sender !== serverIdFromKey)
    errors.push("Sender does not match private key provided."); 
  const msgHash = SHA256(txData).toString();
  if (!key.verify(msgHash, signature))
    errors.push("Transaction signature was invalid!"); 
  return errors;  
}

function processTransaction(txData) {
  const amt = Number(txData.amount);
  balances[txData.sender] -= amt;
  balances[txData.recipient] += amt;
}

function getServerIdFromPublicKey(publicKey) {
  return `${publicKey.substring(publicKey.len-40, 40)}`;
}

let balances = {};
let moneySupply = 0;
for (let i = 0; i < 3; i++) {
  const key = ec.genKeyPair();
  const publicKey = key.getPublic().encode('hex');
  const serverId = getServerIdFromPublicKey(publicKey);
  balances[serverId] = 10*i+50;
  moneySupply += balances[serverId];
  console.log({
    privateKey: key.getPrivate().toString(16),
    publicX: key.getPublic().x.toString(16),
    publicY: key.getPublic().y.toString(16),
    public: serverId
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
  const errors = verifyTransaction(req.body.txData, req.body.signature, req.body.publicKey);  
  const isValid = errors.length === 0;
  if (isValid) {
    processTransaction(req.body.txData);
  }
  res.send({ txIsValid: isValid, errors: errors, balance: balances[req.body.txData.sender] });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});
