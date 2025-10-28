// test/transcript_attendance.test.js
const TranscriptAttendance = artifacts.require("TranscriptAttendance");

// Small helpers to normalize Truffle/Web3 return types across versions
const n = (x) => Number(x);                   // string/BN/BigInt -> Number
const wei = (eth) => web3.utils.toWei(eth);   // "0.01" -> wei string

contract("TranscriptAttendance", (accounts) => {
  const registrar = accounts[0];
  const teacher   = accounts[1];
  const student   = accounts[2];
  const verifier  = accounts[3];

  let c;

  beforeEach(async () => {
    c = await TranscriptAttendance.new(registrar, registrar, { from: registrar });
    await c.addCourse(101, "Solidity 101", teacher, { from: registrar });
    await c.registerStudent(student, { from: registrar });
    await c.enrollInCourse(student, 101, { from: registrar });
  });

  it("issues and finalizes a grade", async () => {
    await c.issueGrade(student, 101, "A", "", { from: teacher });

    let rec = await c.viewRecord(student, 101);
    // rec fields are strings/bools in Truffle; compare directly
    assert.equal(rec.grade, "A", "grade should be A before finalize");
    assert.equal(rec.finalized, false, "record should not be finalized yet");

    await c.finalizeRecord(student, 101, { from: registrar });

    rec = await c.viewRecord(student, 101);
    assert.equal(rec.finalized, true, "record should be finalized");
  });

  it("marks attendance", async () => {
    const now = Math.floor(Date.now() / 1000);
    // enum Status.Present == 0
    await c.markAttendance(student, 101, now, 0, "", { from: teacher });

    const list = await c.viewAttendance(student, 101);
    assert.equal(list.length, 1, "should have one attendance entry");

    const entry = list[0];
    const ts = n(entry.date);     // robust across BN/string/BigInt
    const status = n(entry.status);

    assert.ok(Math.abs(ts - now) < 30, `timestamp drift too large: got ${ts}, expected ~${now}`);
    assert.equal(status, 0, "status should be Present (0)");
    assert.equal(entry.ipfsHash, "", "ipfsHash should match what we set");
  });

  it("verifies transcript (payable) and lets registrar withdraw", async () => {
    // Prepare a finalized record
    await c.issueGrade(student, 101, "B+", "", { from: teacher });
    await c.finalizeRecord(student, 101, { from: registrar });

    // Set fee
    const fee = wei("0.01");
    await c.setVerificationFee(fee, { from: registrar });

    // Pay to verify
    const txVerify = await c.verifyTranscript(student, 101, {
      from: verifier,
      value: fee,
    });
    // Ensure event emitted
    const evtVerify = txVerify.logs.find((l) => l.event === "TranscriptVerified");
    assert.ok(evtVerify, "TranscriptVerified event not emitted");

    // Withdraw fees to treasury (registrar)
    const txWithdraw = await c.withdrawFees({ from: registrar });
    const evtWithdraw = txWithdraw.logs.find((l) => l.event === "FeesWithdrawn");
    assert.ok(evtWithdraw, "FeesWithdrawn event not emitted");

    // Optional: sanity check amount > 0
    const amount = evtWithdraw.args.amount;
    assert.ok(n(amount) > 0, "withdraw amount should be > 0");
  });
});