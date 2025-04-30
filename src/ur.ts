import { c } from './canvas'
import { TouchMouse } from './loop_input'
import AudioContent from './audio'

type XY = [number, number]
type XYWH = [number, number, number, number]

let nb_bg = 5
let bg_tiles: XY[]

type HoverColor = 0 | 1 | 2

type FgTile = {
    is_hidden: boolean
    is_filled: boolean
    hover_color: HoverColor
    xywh: XYWH
    ox: XY
}

let fg_tiles: FgTile[]

type DdTile = {
    is_filled: boolean
    shape_pos: XYWH
    off_pos?: XY
    pos: XY
}

type DdShape = {
    slot: number
    dd_tiles: DdTile[]
    t_hovering: number
    t_cancel: number
    t_commit: number
}

let dd_shapes: DdShape[]


type DragHandler = {
    is_hovering?: XY
    is_down?: XY
    is_just_down?: XY
    is_up?: XY
    is_double_click?: XY
    update(delta: number): void
    has_moved_after_last_down: boolean
}

function DragHandler() {

    let is_hovering: XY | undefined

    let is_down: XY | undefined

    let is_up: XY | undefined

    let is_just_down: XY | undefined

    let is_double_click: XY | undefined
    let has_moved_after_last_down = false

    let t_double_click = 0

    function scale_e(e: XY): XY {
        return [e[0] * 160, e[1] * 90]
    }

    let hooks = {
        on_down(e: XY) {
            e = scale_e(e)

            is_up = undefined
            is_down = e
            is_just_down = e
            has_moved_after_last_down = false
        },
        on_up(e: XY) {
            e = scale_e(e)
            is_down = undefined
            is_hovering = undefined
            is_up = e
        },
        on_move(e: XY) {
            e = scale_e(e)

            is_hovering = e
            has_moved_after_last_down = true
        }
    }


    TouchMouse(c.canvas, hooks)

    return {
        get is_hovering() {
            return is_hovering
        },
        get is_down() {
            return is_down
        },
        get is_up() {
            return is_up
        },
        get is_just_down() {
            return is_just_down
        },
        get is_double_click() {
            return is_double_click
        },
        get has_moved_after_last_down() {
            return has_moved_after_last_down
        },
        update(delta: number) {

            is_double_click = undefined

            if (is_just_down) {
                if (t_double_click > 0) {
                    is_double_click = is_just_down
                    t_double_click = 0
                }
            }

            t_double_click = appr(t_double_click, 0, delta)
            is_just_down = undefined
            is_up = undefined
        }
    }
}

const button_boxes: Record<string, XYWH> = {
    back: [0, 0, 24, 16],
    restart: [0, 0, 24, 16],
    next: [96, 15, 30, 80]
}

let drag: DragHandler

let t: number

let t_restart: number

let t_win: number

let is_has_next: boolean

let bg_speed: number

let drag_shape: DdShape | undefined
let drag_decay: [XY, XY, XY, XY]
let hover_shape: DdShape | undefined


let o: XYWH = [1, 1, 1, 1]
let s: XYWH = [1, 1, 1, 0]
let s2: XYWH = [1, 1, 0, 1]
let s3: XYWH = [1, 0, 1, 1]
let s4: XYWH = [0, 1, 1, 1]
let l1: XYWH = [0, 1, 0, 0]
let x1: XYWH = [0, 1, 1, 0]


let is_hovering_next: boolean

export function _init() {
    is_hovering_next = false

    t_thanks = 0
    level = 0
    t = 0
    bg_speed = 0

    _restart_level()

}


let levels = [
    `
.....
.....
..1a.
..aa.
.....
`,
    `
.....
.2b..
.b1a.
..aa.
.....
`,
    `
.2b3a
.b..a
.4..5
.ccaa
.....
`,
    `
.2b3a
.b1da
.4dd5
.ccaa
.....
`,
    `
.2a..
.a3a.
...a5
...bb
.....
`,
    `
.....
.2o..
.o8..
...1o
...oo
`,
    `
.....
..82c
.1oc.
.oo5.
..cc.
`,
    `
...4.
..8oo
.82c.
1oc..
oo...
`,
    `
.....
...6.
..a..
.6.1a
a..aa
`,
    `
.....
...68
c2s1o
c65oo
scc..
`,
]

let level = levels.length - 1


let music_playing = false

function _restart_level() {

    t_restart = 0

    t_win = 0

    is_has_next = false

    drag_decay = [[0, 0], [0, 0], [0, 0], [0, 0]]

    drag = DragHandler()

    bg_tiles = []
    fg_tiles = []
    dd_shapes = []

    for (let i = 0; i < nb_bg + 2; i++) {
        for (let j = 0; j < nb_bg; j++) {
            bg_tiles.push([j % 2 * 16 + i * 28, j * 28])
        }
    }


    load_level(level)

}

let t_thanks: number
function load_level(nb: number) {

    if (nb > levels.length - 1) {
        t_thanks = 2000
        return
    }

    let level = levels[nb]
    let level_lines = level.trim().split('\n').map(_ => _.trim().split(''))
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            let line = level_lines[j]
            let char = line[i]
            fg_tiles.push({ is_hidden: char === '.', is_filled: false, hover_color: 0, xywh: [i * 17, 15 + j * 15, 0, 0], ox: [0, 0] })
        }
    }
    fg_tiles.shift()


    let k = 0
    arr_shuffle(level_lines)
    level_lines.forEach((line) => {

        arr_shuffle(line)
        line.forEach((char) => {

            if (char === '1') {
                push_tile(k++, o)

            }
            if (char === '2') {
                push_tile(k++, s)
            }
            if (char === '3') {
                push_tile(k++, s2)

            }
            if (char === '4') {
                push_tile(k++, s3)
            }
            if (char === '5') {
                push_tile(k++, s4)
            }
            if (char === '8') {
                push_tile(k++, l1)
            }
            if (char === '6') {
                push_tile(k++, x1)
            }

        })
    })
}

function push_tile(slot: number, l: XYWH) {

    let pp = [
        [92, 0], [128, 0],
        [92, 30], [128, 30],
        [92, 60], [128, 60],
        [92, 90], [128, 90],
    ]

    let dd_tiles: DdTile[] = []

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            let is_filled = l[i + j * 2] === 1
            let x = i * 14
            let y = j * 13

            dd_tiles[i + j * 2] = {
                is_filled,
                shape_pos: [pp[slot][0], pp[slot][1], x, y],
                pos: [pp[slot][0] + x, pp[slot][1] + y],
            }
        }
    }

    dd_shapes.push({
        dd_tiles,
        slot,
        t_hovering: 0,
        t_cancel: 0,
        t_commit: 0
    })
}


export function _update(delta: number) {
    
    if (t_win > 0) {
        is_has_next = true
    }
    t_win = appr(t_win, 0, delta)

    if (t_restart > 0) {
        t_restart = appr(t_restart, 0, delta)
        if (t_restart === 0) {
            _restart_level()
        }

        bg_speed = 1 + lerp(bg_speed, 200, t_restart / 1000)
    }

    t += delta

    bg_speed = appr(bg_speed, 1, 200 * delta / 1000)
    for (let i = 0; i < nb_bg + 2; i++) {
        for (let j = 0; j < nb_bg; j++) {
            bg_tiles[i * nb_bg + j][0] += bg_speed * delta / 1000
            bg_tiles[i * nb_bg + j][1] -= bg_speed * delta / 1000

            bg_tiles[i * nb_bg + j][0] += 200
            bg_tiles[i * nb_bg + j][0] %= 200

            bg_tiles[i * nb_bg + j][1] += 150
            bg_tiles[i * nb_bg + j][1] %= 150
        }
    }

    t_drop_shake = appr(t_drop_shake, 0, delta)

    for (let i = 0; i < fg_tiles.length; i++) {
        if (!fg_tiles[i].is_filled) {
            continue
        }
        if (t_drop_shake > 0) {

            let t = 1 - t_drop_shake / 200 + i / fg_tiles.length * 0.2 + Math.random() * 0.2
            const shakeX =
                Math.sin(t * Math.PI * 8) * (1 - t) * 0.5 + // Primary shake
                Math.sin(t * Math.PI * 24) * (1 - t) * 0.2 + // High frequency jiggle
                Math.sin(t * Math.PI * 3) * (1 - t) * 0.3; // Slow wobble

            const shakeY =
                Math.cos(t * Math.PI * 7.5) * (1 - t) * 0.5 + // Slightly offset from X for organic feel
                Math.sin(t * Math.PI * 22) * (1 - t) * 0.15 + // Tiny high frequency
                Math.cos(t * Math.PI * 2.8) * (1 - t) * 0.25; // Slow wobble

            // Easing function to make it start fast and slow down
            const easeOut = 1 - Math.pow(1 - t, 3);

            console.log(shakeX)
            fg_tiles[i].ox[0] = shakeX * 2 * easeOut
            fg_tiles[i].ox[1] = shakeY * 2 * easeOut
        } else {
            fg_tiles[i].ox = [0, 0]
        }
    }

    hover_shape = undefined
    if (drag.is_hovering) {
        let { is_hovering } = drag
        if (drag_shape) {

            drag_shape.t_hovering = 120

            drag_shape.dd_tiles.forEach((tile, i) => {
                if (!tile) {
                    return
                }
                tile.pos = [
                    is_hovering[0] + drag_decay[i][0],
                    is_hovering[1] + drag_decay[i][1]]
            })

        } else {
            let shape = dd_shapes.find(shape => shape.dd_tiles.find(_ => _ && box_intersect(dd_tile_box(_), cursor_box(is_hovering))))

            if (shape) {
                hover_shape = shape
                shape.t_hovering = 120
            }
        }
    }



    if (drag.is_down) {
        let { is_down } = drag

        let dd_shape
        let dd_tile
        if (!music_playing) {

            music_playing = true
            AudioContent.play('song_bard', true, 0.1)
        }


        
        for (let shape of dd_shapes) {
            for (let tile of shape.dd_tiles) {
                if (!tile) {
                    continue
                }
                if (box_intersect(dd_tile_box(tile), cursor_box(is_down))) {
                    dd_shape = shape
                    dd_tile = tile
                    break
                }
            }
        }

        if (dd_tile && dd_shape !== drag_shape) {
            if (drag_shape) {
                cancel_drag(drag_shape)
            }
            drag_shape = dd_shape
            if (drag_shape) {
                drag_decay = drag_shape.dd_tiles.map<XY>(tile =>
                    tile ?  [tile.pos[0] - is_down[0], tile.pos[1] - is_down[1]] : [0, 0]) as [XY, XY, XY, XY]

            }
            AudioContent.play('drag', false, 0.5)
        }
    } else {
        if (drag_shape) {
            let is_committed = commit_drag(drag_shape)
            if (!is_committed) {
                cancel_drag(drag_shape)
            }
            drag_shape = undefined

            if (dd_shapes.length === 0) {
                t_win = 2000
                AudioContent.play('win', false, 0.5)
            }
        }
    }

    dd_shapes.forEach(shape => update_shape(shape, delta))

    if (commited_shape) {
        update_shape(commited_shape, delta)
    }

    fg_tiles.forEach(tile => tile.hover_color = 0)

    if (drag_shape) {
        const shape = drag_shape
        let tile0 = drag_shape.dd_tiles.find(_ => !!_)!
        let min_fg_tile: FgTile | undefined
        let min_ratio: number | undefined
        fg_tiles.forEach((fg_tile) => {
            let ratio = box_intersect_ratio(dd_tile_box(tile0), fg_box(fg_tile.xywh)).ratio_b
            if (ratio > 0 && (min_ratio === undefined || ratio > min_ratio)) {
                min_fg_tile = fg_tile
                min_ratio = ratio
            }
        })
        if (min_fg_tile) {
            const i = fg_tiles.indexOf(min_fg_tile) + 1

            let [x, y] = [Math.floor(i / 5), i % 5]

            let tiles = shape.dd_tiles.map((_, i) =>
                _.is_filled && 
                fg_tiles[y + Math.floor((i) / 2) + (x + (i) % 2) * 5 - 1]).filter(Boolean)
            let all_empty = tiles.every(_ => !_ || (_.is_filled === false))

            if (all_empty) {
                tiles.forEach(_ => {
                    if (_) {
                        _.hover_color = 1
                    }
                })
            } else {
                tiles.forEach(_ => {
                    if (_)
                        _.hover_color = 2
                })
            }
        }
    }

    if (drag.is_just_down) {
        if (box_intersect(cursor_box(drag.is_just_down), button_box(button_boxes.restart))) {
            if (t_thanks > 0) {
                _init()
            }
            t_restart = 200
        }
    }

        if (t_win === 0 && is_has_next) {
            if (drag.is_hovering) {
                if (box_intersect(cursor_box(drag.is_hovering), button_box(button_boxes.next))) {
                    is_hovering_next = true
                } else {
                    is_hovering_next = false
                }
            }
            if (drag.is_just_down) {
                if (box_intersect(cursor_box(drag.is_just_down), button_box(button_boxes.next))) {
                    level++
                    t_restart = 200
                }
            }
        }

    drag.update(delta)
}

function button_box(button: XYWH) {
    return button
}

function fg_box(tile: XYWH): XYWH {
    return [tile[0] + 6, tile[1] + 2, 14, 12]
}

function cancel_drag(shape: DdShape) {
    shape.t_cancel = 200
    drag_decay = [[0, 0], [0, 0], [0, 0], [0, 0]]
    AudioContent.play('drop', false, 0.5)
}

let commited_shape: DdShape | undefined
let t_drop_shake = 0

function commit_drag(shape: DdShape) {
    let pp = fg_tiles.filter(_ => !_.is_hidden && _.is_filled === false && _.hover_color === 1)
    if (pp.length !== shape.dd_tiles.filter(_ => _.is_filled).length) {
        return false
    }
    pp.forEach(_ => _.is_filled = true)
    dd_shapes.splice(dd_shapes.indexOf(shape), 1)

    commited_shape = shape
    commited_shape.t_commit = 200
    drag_decay = [[0, 0], [0, 0], [0, 0], [0, 0]]

    AudioContent.play('drop2', false, 0.5)

    t_drop_shake = 200

    return true
}

function update_shape(shape: DdShape, delta: number) {

    if (shape.t_commit > 0) {

        shape.t_commit = appr(shape.t_commit, 0, delta)
        if (shape.t_commit === 0) {
            shape.t_commit = -100
        }
    }
    if (shape.t_commit < 0) {
        shape.t_commit = appr(shape.t_commit, 0, delta)
        if (shape.t_commit === 0) {
            commited_shape = undefined
        }
    }
    shape.t_cancel = appr(shape.t_cancel, 0, delta)
    shape.t_hovering = appr(shape.t_hovering, 0, delta)

    const off_tiles: XY[] = [[1, 1], [-1, 1], [1, -1], [-1, -1]]

    for (let i = 0; i < shape.dd_tiles.length; i++) {
        let tile = shape.dd_tiles[i]
        if (!tile) {
            continue
        }
        if (shape.t_hovering > 0) {
            tile.off_pos = t % 600 < 300 ? undefined : off_tiles[i]
        } else {
            tile.off_pos = [0, 0]
        }

        if (shape.t_cancel > 0) {
            tile.pos[0] = lerp(tile.pos[0], tile.shape_pos[0] + tile.shape_pos[2], ease(1 - shape.t_cancel / 200))
            tile.pos[1] = lerp(tile.pos[1], tile.shape_pos[1] + tile.shape_pos[3], ease(1 - shape.t_cancel / 200))
        }

        if (shape.t_commit > 0) {
            //tile.pos[0] = lerp(tile.pos[0], commited_fg_box![0] + tile.shape_pos[2] + 0 * off_commit_tiles[i][0], ease(1 - shape.t_commit / 200))
            //tile.pos[1] = lerp(tile.pos[1], commited_fg_box![1] + tile.shape_pos[3] + 0 * off_commit_tiles[i][1], ease(1 - shape.t_commit / 200))
        }

    }
}

function ease(t: number): number {
    return t * t * (3 - 2 * t)
}

function box_intersect(a: XYWH, b: XYWH) {
    let [ax, ay, aw, ah] = a
    let [bx, by, bw, bh] = b

    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function box_intersect_ratio(a: XYWH, b: XYWH) {
  let [a_x, a_y, a_width, a_height] = a;
  let [b_x, b_y, b_width, b_height] = b;

  // Calculate the coordinates of the intersection rectangle
  let intersect_x1 = Math.max(a_x, b_x);
  let intersect_y1 = Math.max(a_y, b_y);
  let intersect_x2 = Math.min(a_x + a_width, b_x + b_width);
  let intersect_y2 = Math.min(a_y + a_height, b_y + b_height);

  // Calculate the width and height of the intersection
  let intersect_width = Math.max(0, intersect_x2 - intersect_x1);
  let intersect_height = Math.max(0, intersect_y2 - intersect_y1);

  // Calculate the area of intersection
  let intersection_area = intersect_width * intersect_height;

  // Calculate the areas of the individual boxes
  let area_a = a_width * a_height;
  let area_b = b_width * b_height;

  // Calculate the ratio of intersection (you can choose which area to divide by)
  // Ratio with respect to the area of box a
  let ratio_a = area_a === 0 ? 0 : intersection_area / area_a;

  // Ratio with respect to the area of box b
  let ratio_b = area_b === 0 ? 0 : intersection_area / area_b;

  // Ratio with respect to the area of their union (optional, but sometimes useful)
  let union_area = area_a + area_b - intersection_area;
  let ratio_union = union_area === 0 ? 0 : intersection_area / union_area;

  return {
    intersection_area: intersection_area,
    ratio_a: ratio_a,       // Intersection area / area of box a
    ratio_b: ratio_b,       // Intersection area / area of box b
    ratio_union: ratio_union // Intersection area / area of their union
  };
}


function dd_tile_box(dd_tile: DdTile): XYWH {
    return [dd_tile.pos[0] + 2, dd_tile.pos[1] + 2, 12, 12]
}

function cursor_box(xy: XY): XYWH {
    return [xy[0] - 2, xy[1] - 2, 9, 9]
}


export function _render(_alpha: number) {

    c.clear()

    c.rect(0, 0, 160, 90, '#3978a8')

    for (let i = 0; i < bg_tiles.length; i++) {
        c.image(bg_tiles[i][0] - 20, bg_tiles[i][1] - 20, 16, 16, 88, 0)
    }


    for (let i = 0; i < fg_tiles.length; i++) {
        if (fg_tiles[i].is_hidden) {
            continue
        }
        let [x, y, w, h] = fg_tiles[i].xywh
        let [ox, oy] = fg_tiles[i].ox
        x += ox
        y += oy
        if (fg_tiles[i].is_filled) {
            if (fg_tiles[i].hover_color === 2) {
                c.image(x, y, 24, 16, 56, 32)
            } else if (fg_tiles[i].hover_color === 1) {
                c.image(x + w, y + h, 24, 16, 56, 48)
            } else if (fg_tiles[i].hover_color === 0) {
                c.image(x + w, y + h, 24, 16, 56, 48)
            }

        } else {
            if (fg_tiles[i].hover_color === 2) {
                c.image(x, y, 24, 16, 56, 32)
            } else if (fg_tiles[i].hover_color === 1) {
                c.image(x + w, y + h, 24, 16, 56, 16)
            } else if (fg_tiles[i].hover_color === 0) {
                c.image(x + w, y + h, 24, 16, 56, 0)
            }
        }

        if (false) {
            c.rect(...fg_box(fg_tiles[i].xywh), 'red')
        }

        if (i % 2 === 0) {
            c.image(fg_tiles[i].xywh[0] + 8, fg_tiles[i].xywh[1] + 5, 32, 24, 88, 16)
        }
    }

    for (let slot = 0; slot < dd_shapes.length; slot++) {
        if (dd_shapes[slot] !== drag_shape) {
            render_shape(dd_shapes[slot])
        }
    }


    c.image(...button_boxes.back, 0, 80)


    if (drag_shape) {
        render_shape(drag_shape)
    }

    if (commited_shape) {
        render_shape(commited_shape)
    }


    if (is_has_next) {
        let ty = ease(t_win / 400) * 90
        let ty2 = -90 + (1 - ease(t_win / 600)) * 90
        c.image(50, ty, 14, 90, 136, 0)
        c.image(64, ty2, 40, 90, 150, 0)

        if (t_win === 0) {
            if (!is_hovering_next) {
                c.image(...button_boxes.next, 192, 0)
            } else {
                c.image(...button_boxes.next, 228, 0)
            }
        }
    }


    if (drag.is_hovering) {
        if (drag_shape) {
            c.image(...cursor_box(drag.is_hovering), 112, 40)
        } else if (hover_shape) {
            c.image(...cursor_box(drag.is_hovering), 96, 40)
        } else {
            c.image(...cursor_box(drag.is_hovering), 80, 40)
        }
    }

    if (t_thanks > 0) {
    c.image(20, 0, 160, 80, 32, 96)
    }

}



function render_shape(shape: DdShape) {
    let dd_tiles = shape.dd_tiles

    if (shape.t_commit % 200 > 100) {
        return
    }

    for (let tile of dd_tiles) {
        if (!tile.is_filled) {
            continue
        }
        let [x, y] = tile.pos
        let [ox, oy] = tile.off_pos ?? [0, 0]
        x += ox
        y += oy
        if (shape.t_hovering > 0) {
            c.image(x,  y, 16, 16, 0, 0)
            //c.image(x, y, 16, 16, ...auto_tile_src(tiles, i))
        } else {
            c.image(x, y, 16, 16, 0, 0)
        }

        //c.rect(...tile_box(tiles[i]), 'red')
    }
}

export function appr(value: number, target: number, by: number): number {
    if (value < target) {
        return Math.min(value + by, target)
    } else if (value > target) {
        return Math.max(value - by, target)
    }
    return value
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

/* https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array */
export function arr_shuffle<A>(a: Array<A>, rng = () => Math.random(), b = 0, c = 0, d?: A) {
  c=a.length;while(c)b=rng()*c--|0,d=a[c],a[c]=a[b],a[b]=d;
  return a
}