// migrations/2_seed_demo_data.js
const TranscriptAttendance = artifacts.require("TranscriptAttendance");

module.exports = async function (deployer, network, accounts) {
  // Only seed on local networks:
  if (!["development", "test"].includes(network)) return;

  const registrar = accounts[0];
  const teacher   = accounts[1];
  const student   = accounts[2];

  const c = await TranscriptAttendance.deployed();

  await c.addCourse(101, "Solidity 101", teacher, { from: registrar });
  await c.registerStudent(student, { from: registrar });
  await c.enrollInCourse(student, 101, { from: registrar });
};