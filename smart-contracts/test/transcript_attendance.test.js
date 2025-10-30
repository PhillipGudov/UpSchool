const TranscriptAttendance = artifacts.require("TranscriptAttendance");

contract("TranscriptAttendance (smoke)", (accounts) => {
  const [registrar, treasury, teacher, student] = accounts;

  it("deploys and lets registrar add a course, register/enroll student", async () => {
    const c = await TranscriptAttendance.new(registrar, treasury, { from: registrar });

    await c.addCourse(1, "Math", teacher, { from: registrar });
    const course = await c.getCourse(1);
    assert.equal(course.name, "Math");
    assert.equal(course.teacher, teacher);

    await c.registerStudent(student, { from: registrar });
    await c.enrollInCourse(student, 1, { from: registrar });
    const enrolled = await c.isStudentEnrolled(student, 1);
    assert.equal(enrolled, true);
  });
});