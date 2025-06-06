# Examples

## Hello World

```throne
"Hello"
"Hello" = "World"
```

## Family

```throne
Mary is sister of David
Sarah is child of Mary
Tom is child of David

CHILD is child of PARENT . AUNT is sister of PARENT . COUSIN is child of AUNT = COUSIN is cousin of CHILD
```

## Guessing Game

```throne
// enter your guess here:
guess 2

seed 34913906
seed SEED . % SEED 1234 SEED' . % SEED' 10 SECRET = secret SECRET
guess GUESS: {
    secret GUESS = "correct!"
    secret SECRET . < GUESS SECRET = "too low!"
    secret SECRET . > GUESS SECRET = "too high!"
}
```

## Draw

```throne
draw "🌕" 5 5
draw "🌕" 14 5
draw "🌕" 14 14
draw "🌕" 5 14
draw "👑" 7 8
draw "throne" 7 9

#update . draw "🌕" X Y = draw "🌖" X Y
#update . draw "🌖" X Y = draw "🌗" X Y
#update . draw "🌗" X Y = draw "🌘" X Y
#update . draw "🌘" X Y = draw "🌑" X Y
#update . draw "🌑" X Y = draw "🌒" X Y
#update . draw "🌒" X Y = draw "🌓" X Y
#update . draw "🌓" X Y = draw "🌔" X Y
#update . draw "🌔" X Y = draw "🌕" X Y

#update . draw "👑" X Y . - X 7 X' . + X' 1 X'' . % X'' 6 X''' . + X''' 7 X'''' = draw "👑" X'''' Y
```

## Game of Life

```throne
// Conway's Game of Life (https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life):
//  1. Any live cell with two or three live neighbours survives.
//  2. Any dead cell with three live neighbours becomes a live cell.
//  3. All other live cells die in the next generation. Similarly, all other dead cells stay dead.

// glider pattern
cell 1 0
cell 2 1
cell 0 2
cell 1 2
cell 2 2

cell 18 19
cell 17 18
cell 19 17
cell 18 17
cell 17 17

#update = #generate-neighbors

// place an 'n' marker phrase for each grid square neighbouring a live cell
#generate-neighbors . $cell X Y . - X 1 X0 . + X 1 X1 . - Y 1 Y0 . + Y 1 Y1 . !processed X Y =
    processed X Y . n X0 Y0 1 . n X Y0 1 . n X1 Y0 1 . n X1 Y 1 . n X1 Y1 1 . n X Y1 1 . n X0 Y1 1 . n X0 Y 1 . #combine
#generate-neighbors . () = #apply-rules-1-2

#combine: {
    // combine overlapping 'n' marker phrases
    n X Y 1 . n X Y N1 . + N1 1 N2 = n X Y N2
    () = #generate-neighbors
}

#apply-rules-1-2: {
    // keep any cell with exactly two live neighbours (rule 1)
    cell X Y . n X Y 2 = survive-cell X Y

    // spawn a live cell on any grid square with exactly three live neighbours (rules 1 and 2)
    n X Y 3 = survive-cell X Y

    () = #apply-rule-3
}

#apply-rule-3: {
    // discard any cells that did not survive (rule 3)
    cell X Y = ()
    () = #draw
}

#draw: {
    // draw each 'survive-cell' and convert it to a 'cell' for the next iteration
    survive-cell X Y = cell X Y . draw "⬛" X Y
    () = #post-update
}

#post-update: {
    // clean up temporary phrases
    processed _ _ = ()
    n _ _ _ = ()
}
```

## Blocks

```throne
// initialize state
fall-timer 5 . default-fall-timer 5 . block-id 0 . falling-shape-id 0 . max-width 10 . max-height 20

// spawn a shape that will fall, if one doesn't already exist
#update . !shape _X _Y _BLOCKS . falling-shape-id ID . + ID 1 ID' = falling-shape-id ID' . #new-shape
#update . $shape _X _Y _BLOCKS = #input-u

// define available shapes and where they spawn
#new-shape . $max-height H = new-shape 4 H ((block -1 0) ((block 0 0) ((block 1 0) ((block 0 1) (cons))))) . #shape-to-blocks (#input-lr)
#new-shape . $max-height H = new-shape 4 H ((block 0 -2) ((block 0 -1) ((block 0 0) ((block 0 1) (cons))))) . #shape-to-blocks (#input-lr)
#new-shape . $max-height H = new-shape 4 H ((block 0 -1) ((block 0 0) ((block 0 1) ((block 1 1) (cons))))) . #shape-to-blocks (#input-lr)

// this stage is the beginning of the sequence of stages that places the blocks defined by a shape.
// placing these blocks is either the result of a new shape being spawned at the top of the screen,
// or an existing falling shape being moved or rotated. in the second case we move and rotate by
// clearing any existing blocks and spawning a new set of blocks at updated positions.
#shape-to-blocks RETURN: {
    // clear existing falling blocks
    block-falling _ID _X _Y = ()
    // prepare to spawn new blocks defined by the shape
    $new-shape _X _Y BLOCKS . !BLOCKS = BLOCKS
    () = #shape-to-blocks-create RETURN
}

// this stage spawns 'falling' blocks defined by the shape
#shape-to-blocks-create RETURN: {
    $new-shape X Y _ . (block DX DY) BLOCK . block-id ID . + ID 1 ID' . + X DX X' . + Y DY Y' = block-falling ID X' Y' . block-id ID' . BLOCK
    () = #shape-to-blocks-check RETURN
}

// this stage aborts the placement of blocks if any constraint is violated
#shape-to-blocks-check RETURN . block-falling _ X Y . $block-set _ _ X Y = #shape-to-blocks-fail RETURN
#shape-to-blocks-check RETURN . block-falling _ X _ . < X 0 = #shape-to-blocks-fail RETURN
#shape-to-blocks-check RETURN . block-falling _ X _ . $max-width W . >= X W = #shape-to-blocks-fail RETURN
#shape-to-blocks-check RETURN . () = #shape-to-blocks-ok RETURN

// in this stage placement of blocks succeeded, so the new shape becomes a falling shape
#shape-to-blocks-ok RETURN: {
    shape _ _ _ = ()
    new-shape X Y BLOCKS . () = shape X Y BLOCKS . RETURN
}

// in this stage placement of blocks from the new shape failed, so we return to the previous falling shape
#shape-to-blocks-fail RETURN: {
    new-shape _ _ _ = ()
    $shape X Y BLOCKS . () = new-shape X Y BLOCKS . #shape-to-blocks RETURN
}

// rotate the shape if the up arrow key is pressed
#input-u . ^key-pressed up = #rotate-shape
#input-u . () = #input-lr
#rotate-shape: {
    $shape X Y BLOCKS . !new-shape X Y _  = new-shape X Y BLOCKS . new-blocks (cons)
    new-shape X Y ((block DX DY) BLOCKS) . new-blocks BLOCKS2 . + DX2 DX 0 = new-shape X Y BLOCKS . new-blocks ((block DY DX2) BLOCKS2)
    new-shape X Y _ . new-blocks BLOCKS . () = new-shape X Y BLOCKS . #shape-to-blocks (#input-d)
}

// move the shape horizontally if the left or right arrow key is pressed
#input-lr . ^key-pressed left . $shape X Y BLOCKS . - X 1 X' = new-shape X' Y BLOCKS . #shape-to-blocks (#input-d)
#input-lr . ^key-pressed right . $shape X Y BLOCKS . + X 1 X' = new-shape X' Y BLOCKS . #shape-to-blocks (#input-d)
#input-lr . () = #input-d

// move the shape down faster than normal if the down arrow key is pressed
#input-d: {
    ^key-down down . default-fall-timer 5 . fall-timer _ = default-fall-timer 1 . fall-timer 0
    ^key-up down . default-fall-timer 1 . fall-timer _ = default-fall-timer 5 . fall-timer 0
    () = #collision
}

// if any falling blocks are about to collide with any set blocks or the bottom of the screen, the
// falling blocks should become set blocks.
#collision: {
    block-falling ID X Y . + Y' 1 Y . $block-set _ _ X Y' = block-setting ID X Y
    block-falling ID X Y . + Y' 1 Y . < Y' 0 = block-setting ID X Y
    $block-setting _ _ _ . block-falling ID X' Y' = block-setting ID X' Y'
    $block-setting _ _ _ . shape _ _ _ = ()
    () = #set
}
#set: {
    block-setting ID X Y . $falling-shape-id SHAPE_ID = block-set ID SHAPE_ID X Y
    $max-width W . () = #score-x . score-counter W 0
}

// mark completed rows for clearing
#score-x . score-counter X Y . + X' 1 X . $block-set _ _ X' Y = score-counter X' Y . #score-x
#score-x . score-counter 0 Y = #clear . clear-y Y
#score-x . $score-counter _ _ . () = #score-y
#score-y . score-counter _ Y . + Y 1 Y' . $max-width W . $max-height H . < Y' H = score-counter W Y' . #score-x
#score-y . score-counter _ _ . () = #fall-tick

// this stage clears blocks in any completed rows
#clear: {
    $clear-y Y . block-set _ _ _ Y = ()
    block-clear-move _ = ()
    () = #clear-move
}

// this stage moves down any blocks hanging in space as a result of clearing completed rows
#clear-move: {
    $clear-y Y . block-set ID SHAPE_ID X Y' . !block-clear-move ID . > Y' Y . - Y' 1 Y'' = block-set ID SHAPE_ID X Y'' . block-clear-move ID
    $max-width W . clear-y _ . () = #score-x . score-counter W 0
}

// move blocks down every TIMER frames
#fall-tick . fall-timer TIMER . >= TIMER 0 . + TIMER2 1 TIMER . >= TIMER2 0 = fall-timer TIMER2 . #draw
#fall-tick . fall-timer TIMER . >= TIMER 0 . + TIMER2 1 TIMER . < TIMER2 0 . $default-fall-timer D = fall-timer D . #fall
#fall . shape X Y BLOCKS . + Y' 1 Y = new-shape X Y' BLOCKS . #shape-to-blocks (#draw)
#fall . () = #draw

<<icon ID "🟥" . % ID 7 0
<<icon ID "🟦" . % ID 7 1
<<icon ID "🟫" . % ID 7 2
<<icon ID "🟩" . % ID 7 3
<<icon ID "🟨" . % ID 7 4
<<icon ID "🟪" . % ID 7 5
<<icon ID "🟧" . % ID 7 6

#draw: {
    $block-falling ID X Y . - 19 Y Y' . !draw _ X Y' . $falling-shape-id SHAPE_ID . <<icon SHAPE_ID ICON = draw ICON X Y'
    $block-set ID SHAPE_ID X Y . - 19 Y Y' . !draw _ X Y' . <<icon SHAPE_ID ICON = draw ICON X Y'
    () = #clean
}

#clean: {
    cons = ()
}
```
