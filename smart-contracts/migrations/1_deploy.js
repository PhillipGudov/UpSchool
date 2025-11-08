const TranscriptAttendance = artifacts.require("TranscriptAttendance");

module.exports = async function (deployer, network, accounts) {
  // registrar: accounts[0], treasury: accounts[1]
  const registrar = accounts[0];
  const treasury = accounts[1];

  await deployer.deploy(TranscriptAttendance, registrar, treasury);
  const instance = await TranscriptAttendance.deployed();

  console.log("TranscriptAttendance deployed at:", instance.address);
  console.log("Registrar (DEFAULT_ADMIN/REGISTRAR_ROLE):", registrar);
  console.log("Treasury:", treasury);
};