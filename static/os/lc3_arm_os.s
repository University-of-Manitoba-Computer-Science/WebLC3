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

; -------------------------
; OPERATING SYSTEM (0x0200)
; -------------------------

; Device register addresses
CON_STATUS: .FILL xFE04
CON_DATA:   .FILL xFE06

; Constants
; To clear the upper byte of a word
BYTE_MASK: .FILL x00FF;

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
    ldr r2, =BYTE_MASK
PUTS_STRING_LOOP:
    ; Load next character into r1
    ldr r1, r0, #0
    ; AND it with itself to set condition codes
    and r1, r1
    ; Break loop if we hit a null character
    beq PUTS_BREAK
    ; Mask character
    and r1, r2
    ; Wait for console to be ready
PUTS_CONSOLE_LOOP:
    ldr r3, =CON_STATUS
    and r3, r3
    bge PUTS_CONSOLE_LOOP
    ; Write character
    ldr r3, =CON_DATA
    str r1, r3, #0
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