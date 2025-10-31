# UpSchool 🎓

A decentralized school management system built on **Ethereum** and **IPFS**. Registrars create courses, teachers issue grades and attendance, students view records, and verifiers confirm authenticity

---

## 🚀 Quick Start

### 1. Clone & Install (through VS Code preferably)

```bash
git clone https://github.com/PhillipGudov/UpSchool.git
cd smart-contracts
npm install

cd ../frontend
npm install
```
---

### 2. Configure Environment

The app needs three services running locally before use:
| Service            | Purpose                     | Default URL             |
| ------------------ | --------------------------- | ----------------------- |
| 🟣 **Ganache**     | Local Ethereum blockchain   | `http://127.0.0.1:8545` |
| 🔵 **IPFS (Kubo)** | Decentralized file storage  | `http://127.0.0.1:5001` |
| 🦊 **MetaMask**    | Wallet & account connection | Browser extension       |

🧱 Step 2.1 — Start Your Blockchain

- Open Ganache through terminal under the smart-contracts directory.

- Make sure it’s running on:

- Network ID: 1337

- RPC Server: http://127.0.0.1:8545

- Copy your Account #0 private key (this will be the Registrar) and two other private keys. The two other private keys will be the student and teacher.

📦 Step 2.2 — Launch IPFS Daemon

- Install Kubo which will have 'ipfs' inside through the terminal

- Create a `.env` file in the frontend or it should be created and you only have to adjust the Contract Address and VITE_IPFS_GATEWAY:

```ini
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_IPFS_API=http://127.0.0.1:5001
```

- Make sure your local blockchain (i.e. Ganache) is running and your smart contract is deployed. Ganache is running on http://127.0.0.1:8545 with Chain ID 1337 and IPFS daemon is active on port 5001.

---

### 3. Deploy Smart Contracts (in a new terminal with Ganache still running)

```bash
cd smart-contracts
npx truffle compile
npx truffle migrate --network development --reset
```
- Export the ABI for the frontend
```powershell
Get-Content build\contracts\TranscriptAttendance.json |
ConvertFrom-Json |
Select-Object -Expand abi |
ConvertTo-Json -Depth 100 |
Out-File ..\frontend\src\abi.json -Encoding utf8
```

---

### 4. Run

```bash
cd ..
cd frontend
npm run dev
```

- Opens automatically at http://localhost:5173
- Auto-refreshes on file changes
- Displays connected wallet & role badges in the header

---

## ⚙️ Roles & Workflow

| Role              | Description                                  |
| ----------------- | -------------------------------------------- |
| 🧾 **Registrar**  | Adds courses, registers & enrolls students   |
| 🧑‍🏫 **Teacher** | Issues grades & marks attendance             |
| 🎓 **Student**    | Views grades & attendance records            |
| ✅ **Verifier**    | Pays a fee to verify transcript authenticity |

---

## 🔗 Connecting to MetaMask

- Add a Custom Network in MetaMask:

| Field           | Value                                          |
| --------------- | ---------------------------------------------- |
| Network Name    | Localhost 8545                                 |
| RPC URL         | [http://127.0.0.1:8545](http://127.0.0.1:8545) |
| Chain ID        | 1337                                           |
| Currency Symbol | ETH                                            |


<img width="349" height="566" alt="image" src="https://github.com/user-attachments/assets/009773ee-6ad7-419a-a624-ab297d7a101f" />

- Then import your Ganache Account #0 private key. 
- This account acts as the Registrar (admin of the contract).

---

## 🚢 Importing Accounts into MetaMask

- Top left click the account name with the arrow pointing down.
  
- Add Wallet

- Import an Account

- It should be through a private key. This is the reason we saved it in Step 2.1

- Then connect it to the custom network we set up.

---

## 🧯 Troubleshooting

| Issue                   | Fix                                                   |
| ----------------------- | ----------------------------------------------------- |
| ❌ *Missing revert data* | Set a verification fee before verifying               |
| ⚪ Roles not showing     | ABI or contract mismatch — re-export ABI              |
| ⚠️ Wrong network        | Switch MetaMask to **Localhost 8545 (Chain ID 1337)** |
| 🧱 IPFS not working     | Run `ipfs daemon` and check ports 5001 / 8080         |
| 🔁 Ganache reset        | Re-import private key, redeploy, update `.env`        |

---

> Empower education. Decentralize learning.
