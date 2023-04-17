; ==========================
;   LC-3 OPERATING SYSTEM
; --------------------------
; WebLC3's implementation of
; the LC-3 operating system.
; The ARM version of the OS.
; --------------------------
;         by Alex Kitt, 2023
; ==========================

.ORIG 0

; --------------------------
; TRAP VECTOR TABLE (0x0000)
; --------------------------
.BLKW x20
; Implemented traps begin at x20
.FILL 0
.FILL 0
.FILL TRAP_PUTS
.FILL 0
.FILL 0
.FILL TRAP_HALT

; -------------------------
; OPERATING SYSTEM (0x0200)
; -------------------------

; Device register addresses
CON_STATUS: .FILL xFE04
CON_DATA:   .FILL xFE06
MCR:        .FILL xFFFE

; Constants (see the bottom of this file for more strings)
; To clear the upper byte of a word
BYTE_MASK:  .FILL x00FF
; To clear the most significant bit of a word
MSB_MASK:   .FILL x7FFF

; -----------------------------------------------------------------------------
; PUTS
; Write a string of ASCII characters to the console display. The characters are
; contained in consecutive memory locations, one character per memory location,
; starting with the address specified in R0. Writing terminates with the
; occurrence of x0000 in a memory location.
; -----------------------------------------------------------------------------
TRAP_PUTS:
    ; Push r0-r3
    push r0, r1, r2, r3

    ; r2 will mask ASCII characters
    ldr r2, [pc, =BYTE_MASK]
    ldr r2, [r2, #0]
PUTS_STRING_LOOP:
    ; Load next character into r1
    ldr r1, [r0, #0]
    ; Set condition codes
    tst r1, r1
    ; Break loop if we hit a null character
    beq PUTS_BREAK
    ; Mask character
    and r1, r2
    ; Wait for console to be ready
PUTS_CONSOLE_LOOP:
    ldr r3, [pc, =CON_STATUS]
    ldr r3, [r3, #0]
    ldr r3, [r3, #0]
    tst r3, r3
    bpl PUTS_CONSOLE_LOOP
    ; Write character
    ldr r3, [pc, =CON_DATA]
    ldr r3, [r3, #0]
    str r1, [r3, #0]
    add r0, #1
    b PUTS_STRING_LOOP
PUTS_BREAK:
    ; Pop registers and return
    pop r0, r1, r2, r3
    rti

; --------------------------------------------------
; HALT
; Halt execution and print a message on the console.
; --------------------------------------------------
TRAP_HALT:
    push r0, r1, r7
HALT_LOOP:
    ; Print message
    ldr r0, [pc, =HALT_MSG]
    PUTS
    ; Stop the clock, leave the rest of MCR untouched
    ldr r1, [pc, =MSB_MASK]
    ldr r1, [r1, #0]

    ldr r0, [pc, =MCR]
    ldr r0, [r0, #0]
    ldr r0, [r0, #0]

    and r0, r1

    ldr r1, [pc, =MCR]
    ldr r1, [r1, #0]
    str r0, [r1, #0]  ; Execution stops here

    ; If clock is manually re-enabled, halt the computer again
    b HALT_LOOP

    pop r0, r1, r7
    rti

; Strings output by some traps and exceptions
IN_PROMPT:  .stringz "Input a character > "
HALT_MSG:   .stringz "Halting computer\n"
PRIV_MSG:   .stringz "Privilege mode violation\n"
ILL_MSG:    .stringz "Illegal opcode exception\n"