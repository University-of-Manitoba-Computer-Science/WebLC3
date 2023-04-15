; ==========================
;   LC-3 OPERATING SYSTEM
; --------------------------
; WebLC3's implementation of
; the LC-3 operating system.
; The ARM version of the OS.
; --------------------------
;         by Alex Kitt, 2023
; ==========================

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
    ; Since the .blkw directive doesn't exist yet, we repeating the same instruction over and over in order to verify that the OS gets loaded
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3
    push r0, r1, r2, r3

; --------------------------------------------------
; HALT
; Halt execution and print a message on the console.
; --------------------------------------------------