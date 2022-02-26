import "./index.scss";
const EC = require('elliptic').ec;
// todo: shouldn't need this
const SHA256 = require('crypto-js/sha256');
const ec = new EC('secp256k1');

const server = "https://localhost:3053";

function validateTransactionData(txtData) {
  let errors = [];
  if (!isValidServerId(txtData.sender))
    errors.push("The sender address supplied is invalid.");
  if (!isValidServerId(txtData.recipient))
    errors.push("The recipient address supplied is invalid.");
  return errors;
}

function isValidServerId(key) {
  return key.length === 40;
}

function isValidPrivateKey(key) {
  return key.length === 64;
}

function generateTransactionSignatureAndPublicKey(txData) {
  let sig = null;
  const privateKey = prompt("Please enter your private key to sign the transaction.");
  if (privateKey !== null)
  {
    if (!isValidPrivateKey(privateKey)) {
      alert("Invalid private key provided. Please try again!");
    } else {
      const key = ec.keyFromPrivate(privateKey);
      var publicKeyFromPrivateKey = key.getPublic().encode('hex');
      // should we be salting this? If so, how does the client safely know the salt?
      // decided "no" because the private key is already unpredictable, not a common string
      // therefore not vulnerable to a rainbow table
      const msgHash = SHA256(txData);
      sig = key.sign(msgHash.toString()); 
    }
  }
  return { signature: sig, publicKey: publicKeyFromPrivateKey };
}

function fetchBalances() {
  let elemBalances = document.getElementById("balances");
  fetch(`${server}/balances`, { headers: { 'Content-Type': 'application/json' }}).then(response => {
    return response.json();
  }).then(({ balances, moneySupply }) => {
    document.getElementById("money-supply").innerText = moneySupply;
    elemBalances.innerHTML = "";
    for (const b in balances) {
      var node = document.createElement("LI");
      var keySpan = document.createElement("SPAN");
      var balanceSpan = document.createElement("SPAN");
      keySpan.appendChild(document.createTextNode(`${b}`));
      balanceSpan.appendChild(document.createTextNode(`[${balances[b]}]`));
      node.appendChild(keySpan);
      node.appendChild(balanceSpan);
      elemBalances.appendChild(node);
    }
  });  
}

document.getElementById("exchange-address").addEventListener('input', ({ target: {value} }) => {
  if(value === "") {
    document.getElementById("balance").innerHTML = 0;
    return;
  }

  fetch(`${server}/balance/${value}`).then((response) => {
    return response.json();
  }).then(({ balance }) => {
    document.getElementById("balance").innerHTML = balance;
  });
});

document.getElementById("transfer-amount").addEventListener('click', () => {
  const sender = document.getElementById("exchange-address").value;
  const amount = document.getElementById("send-amount").value;
  const recipient = document.getElementById("recipient").value;
  // todo: could be a class, with a validate method and better ways of 
  // working with the amount as string/decimal
  const txtData = {
    sender, amount, recipient
  };
  var errors = validateTransactionData(txtData);
  if (errors.length > 0) {
    alert(`Transaction could not be sent [${errors.join("', ")}]`);
  } else {
    const transactionSignatureAndPublicKey = generateTransactionSignatureAndPublicKey(txtData);
    if (transactionSignatureAndPublicKey !== null) {
      const requestBody = {
        txData: txtData,
        publicKey: transactionSignatureAndPublicKey.publicKey,
        signature: {
          r: transactionSignatureAndPublicKey.signature.r.toString(16),
          s: transactionSignatureAndPublicKey.signature.s.toString(16)
        }
      };
      const request = new Request(`${server}/send`, { method: 'POST', body: JSON.stringify(requestBody) });
      fetch(request, { headers: { 'Content-Type': 'application/json' }}).then(response => {
        return response.json();
      }).then(({ txIsValid, balance, errors }) => {
        if (!txIsValid) {
          alert(`Transaction was sent but was invalid! [${errors.join("', ")}]`);
        } else {
          alert("Transaction successful!");
          document.getElementById("balance").innerHTML = balance;
          fetchBalances();
        }
      });
    }      
  }
});

fetchBalances();