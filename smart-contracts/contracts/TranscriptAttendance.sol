// smart-contracts/contracts/TranscriptAttendance.sol
// ───────────────────────────────────────────────────
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TranscriptAttendance
 * @notice Registrar manages courses/students; Teachers issue grades & attendance;
 *         Verifiers can pay a fee to retrieve a student's grade record.
 * @dev Uses OpenZeppelin AccessControl. Roles:
 *      - DEFAULT_ADMIN_ROLE: full admin (granted to registrar in ctor)
 *      - REGISTRAR_ROLE: registrar-only functions
 *      - TEACHER_ROLE: teacher-only functions (auto-granted on addCourse to the assigned teacher)
 */
contract TranscriptAttendance is AccessControl {
    // ───────────────────────────────── Roles
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant TEACHER_ROLE   = keccak256("TEACHER_ROLE");

    // ───────────────────────────────── Data Types
    struct Course {
        uint256 id;
        string name;
        address teacher;
        bool exists;
    }

    struct GradeRecord {
        address student;
        uint256 courseId;
        string grade;     // e.g., "A", "B+", or numeric/letter scale
        string ipfsHash;  // optional transcript/proof file CID
        bool finalized;
        bool exists;
    }

    enum Status { Present, Absent, Excused }

    struct AttendanceEntry {
        uint256 date;     // unix timestamp (UTC midnight recommended)
        Status status;
        string ipfsHash;  // optional proof image/pdf CID
    }

    // ───────────────────────────────── Storage
    mapping(uint256 => Course) public courses;                         // courseId => Course
    mapping(bytes32 => GradeRecord) private records;                   // key(student, courseId) => GradeRecord
    mapping(bytes32 => AttendanceEntry[]) private attendance;          // key(student, courseId) => entries
    mapping(address => bool) public registeredStudents;                // registrar-approved students
    mapping(bytes32 => bool) public isEnrolled;                        // key(student, courseId) => enrolled?

    // fees/treasury
    uint256 public verificationFee;            // in wei
    address payable public treasury;          // registrar/treasury wallet

    // ───────────────────────────────── Events
    event CourseAdded(uint256 indexed courseId, string name, address indexed teacher);
    event StudentRegistered(address indexed student);
    event Enrolled(address indexed student, uint256 indexed courseId);
    event GradeIssued(address indexed student, uint256 indexed courseId, string grade, string ipfsHash);
    event RecordFinalized(address indexed student, uint256 indexed courseId);
    event AttendanceMarked(address indexed student, uint256 indexed courseId, uint256 date, Status status, string ipfsHash);
    event VerificationFeeSet(uint256 newFee);
    event TranscriptVerified(address indexed verifier, address indexed student, uint256 indexed courseId, uint256 paid);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ───────────────────────────────── Custom Errors
    error NotRegistrar();
    error NotTeacher();
    error CourseNotFound();
    error NotCourseTeacher();
    error StudentNotRegistered();
    error NotEnrolled();
    error AlreadyFinalized();
    error InvalidFee();
    error WrongFee();
    error ZeroAddress();

    // ───────────────────────────────── Constructor
    /**
     * @param registrar The address that will be DEFAULT_ADMIN_ROLE and REGISTRAR_ROLE
     * @param _treasury The address that will receive withdrawn fees
     */
    constructor(address registrar, address payable _treasury) {
        if (registrar == address(0) || _treasury == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, registrar);
        _grantRole(REGISTRAR_ROLE, registrar);
        treasury = _treasury;
    }

    // ───────────────────────────────── Internal Helpers / Modifiers
    modifier onlyRegistrar() {
        if (!hasRole(REGISTRAR_ROLE, msg.sender)) revert NotRegistrar();
        _;
    }

    modifier onlyTeacher() {
        if (!hasRole(TEACHER_ROLE, msg.sender)) revert NotTeacher();
        _;
    }

    function _key(address student, uint256 courseId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(student, courseId));
    }

    // ───────────────────────────────── Registrar Functions
    function addCourse(uint256 courseId, string calldata name, address teacher) external onlyRegistrar {
        if (teacher == address(0)) revert ZeroAddress();
        Course storage c = courses[courseId];
        c.id = courseId;
        c.name = name;
        c.teacher = teacher;
        c.exists = true;
        _grantRole(TEACHER_ROLE, teacher);
        emit CourseAdded(courseId, name, teacher);
    }

    function registerStudent(address student) external onlyRegistrar {
        if (student == address(0)) revert ZeroAddress();
        registeredStudents[student] = true;
        emit StudentRegistered(student);
    }

    function enrollInCourse(address student, uint256 courseId) external onlyRegistrar {
        if (!registeredStudents[student]) revert StudentNotRegistered();
        if (!courses[courseId].exists) revert CourseNotFound();
        bytes32 k = _key(student, courseId);
        isEnrolled[k] = true;
        emit Enrolled(student, courseId);
    }

    function setVerificationFee(uint256 newFeeWei) external onlyRegistrar {
        verificationFee = newFeeWei;
        emit VerificationFeeSet(newFeeWei);
    }

    function withdrawFees() external onlyRegistrar {
        uint256 amount = address(this).balance;
        (bool ok, ) = treasury.call{value: amount}("");
        require(ok, "withdraw failed");
        emit FeesWithdrawn(treasury, amount);
    }

    // ───────────────────────────────── Teacher Functions
    function issueGrade(
        address student,
        uint256 courseId,
        string calldata grade,
        string calldata ipfsHash
    ) external onlyTeacher {
        Course memory c = courses[courseId];
        if (!c.exists) revert CourseNotFound();
        if (c.teacher != msg.sender) revert NotCourseTeacher();
        if (!registeredStudents[student]) revert StudentNotRegistered();
        if (!isEnrolled[_key(student, courseId)]) revert NotEnrolled();

        bytes32 k = _key(student, courseId);
        GradeRecord storage rec = records[k];
        if (rec.finalized) revert AlreadyFinalized();

        rec.student  = student;
        rec.courseId = courseId;
        rec.grade    = grade;
        rec.ipfsHash = ipfsHash;
        rec.exists   = true;

        emit GradeIssued(student, courseId, grade, ipfsHash);
    }

    function finalizeRecord(address student, uint256 courseId) external onlyRegistrar {
        bytes32 k = _key(student, courseId);
        GradeRecord storage rec = records[k];
        if (!rec.exists) revert NotEnrolled();
        if (rec.finalized) revert AlreadyFinalized();
        rec.finalized = true;
        emit RecordFinalized(student, courseId);
    }

    function markAttendance(
        address student,
        uint256 courseId,
        uint256 date,
        Status status,
        string calldata ipfsHash
    ) external onlyTeacher {
        Course memory c = courses[courseId];
        if (!c.exists) revert CourseNotFound();
        if (c.teacher != msg.sender) revert NotCourseTeacher();
        if (!registeredStudents[student]) revert StudentNotRegistered();
        if (!isEnrolled[_key(student, courseId)]) revert NotEnrolled();

        attendance[_key(student, courseId)].push(AttendanceEntry({
            date: date,
            status: status,
            ipfsHash: ipfsHash
        }));

        emit AttendanceMarked(student, courseId, date, status, ipfsHash);
    }

    // ───────────────────────────────── Verifier (payable)
    /**
     * @notice Returns the grade record while charging the exact verificationFee.
     *         Registrar can withdraw accumulated fees with withdrawFees().
     */
    function verifyTranscript(address student, uint256 courseId)
        external
        payable
        returns (GradeRecord memory rec)
    {
        if (verificationFee == 0) revert InvalidFee();
        if (msg.value != verificationFee) revert WrongFee();

        bytes32 k = _key(student, courseId);
        rec = records[k]; // may be empty if not exists

        emit TranscriptVerified(msg.sender, student, courseId, msg.value);
    }

    // ───────────────────────────────── Views
    function viewRecord(address student, uint256 courseId)
        external
        view
        returns (GradeRecord memory rec)
    {
        rec = records[_key(student, courseId)];
    }

    function viewAttendance(address student, uint256 courseId)
        external
        view
        returns (AttendanceEntry[] memory)
    {
        return attendance[_key(student, courseId)];
    }

    function getCourse(uint256 courseId) external view returns (Course memory) {
        return courses[courseId];
    }

    function isStudentEnrolled(address student, uint256 courseId) external view returns (bool) {
        return isEnrolled[_key(student, courseId)];
    }
}