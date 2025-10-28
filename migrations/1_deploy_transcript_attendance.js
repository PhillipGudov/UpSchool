const TranscriptAttendance = artifacts.require("TranscriptAttendance");

module.exports = async function (deployer, network, accounts) {
  // Use first account as registrar/treasury in local dev
  const registrar = accounts[0];
  const treasury = accounts[0];

  await deployer.deploy(TranscriptAttendance, registrar, treasury);
};