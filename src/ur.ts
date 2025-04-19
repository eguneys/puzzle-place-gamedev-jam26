import { c } from './canvas'
import { TouchMouse } from './loop_input'
import AudioContent from './audio'

type XY = [number, number]
type XYWH = [number, number, number, number]
type XYWHZZ = [number, number, number, number, number, number]

let nb_bg = 5
let bg_tiles: XY[]

let fg_tiles: XYWH[]

type Shape = {
    slot: number
    tiles: XYWHZZ[]
    t_hovering: number
    t_cancel: number
    pos: XYWH
}

let fg_shapes: Shape[]


type DragHandler = {
    is_hovering?: XY
    is_down?: XY
}

function DragHandler() {

    let is_hovering: XY | undefined

    let is_down: XY | undefined

    let is_up: XY | undefined


    function scale_e(e: XY): XY {
        return [e[0] * 160, e[1] * 90]
    }

    let hooks = {
        on_down(e: XY) {
            e = scale_e(e)

            is_down = e
        },
        on_up(e: XY) {
            e = scale_e(e)
            is_down = undefined
            is_hovering = undefined
        },
        on_move(e: XY) {
            e = scale_e(e)

            is_hovering = e
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
        }
    }
}

let drag: DragHandler

let t: number

let drag_shape: Shape | undefined
let drag_decay: XY
let hover_shape: Shape | undefined

export function _init() {

    t = 0
    drag_decay = [0, 0]

    drag = DragHandler()

    bg_tiles = []
    fg_tiles = []
    fg_shapes = []

    for (let i = 0; i < nb_bg + 2; i++) {
        for (let j = 0; j < nb_bg; j++) {
            bg_tiles.push([j % 2 * 16 + i * 28, j * 28])
        }
    }

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            fg_tiles.push([i * 17, 15 + j * 15, 0, 0])
        }
    }
    fg_tiles.shift()


    let l: XYWH[] = [[0, 0, 1, 1], [0, 1, 1, -1], [1, 0, -1, 1], [1, 1, -1, -1]]

    push_tile(0, l)
    push_tile(1, l)
    push_tile(2, l)
    push_tile(3, l)
    push_tile(4, l)
    push_tile(5, l)
}

function push_tile(slot: number, l: XYWH[]) {

    let pp = [
        [92, 0], [128, 0],
        [92, 30], [128, 30],
        [92, 60], [128, 60],
        [92, 90], [128, 90],
    ]
    let pos: XYWH = [pp[slot][0], pp[slot][1], pp[slot][0], pp[slot][1]]

    let tiles: XYWHZZ[] = []
    for (let i = 0; i< l.length; i++) {
        let x = l[i][0] * 14
        let y = l[i][1] * 13

        let x2 = x + l[i][2]
        let y2 = y + l[i][3]
        tiles.push([x, y, x2, y2, 0, 0])
    }

    fg_shapes.push({
        pos,
        slot,
        tiles,
        t_hovering: 0,
        t_cancel: 0
    })
}

export function _update(delta: number) {

    t += delta

    let bg_speed = 1
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

    hover_shape = undefined
    if (drag.is_hovering) {
        let { is_hovering } = drag

        if (drag_shape) {

            drag_shape.t_hovering = 120

            drag_shape.pos[2] = is_hovering[0] - drag_decay[0]
            drag_shape.pos[3] = is_hovering[1] - drag_decay[1]

        } else {
            let shape = fg_shapes.find(shape => shape.tiles.find(_ => box_intersect(tile_box(shape, _), cursor_box(is_hovering))))

            if (shape) {
                hover_shape = shape
                shape.t_hovering = 120
            }
        }
    }

    if (drag.is_down) {
        let { is_down } = drag

        let shape = fg_shapes.find(shape => shape.tiles.find(_ => box_intersect(tile_box(shape, _), cursor_box(is_down))))

        if (shape && shape !== drag_shape) {
            if (drag_shape) {
                cancel_drag(drag_shape)
            }
            drag_shape = shape
            drag_decay = [is_down[0] - shape.pos[0], is_down[1] - shape.pos[1]]
            AudioContent.play('drag', false, 0.5)
        }
    } else {
        if (drag_shape) {
            let is_committed = commit_drag(drag_shape)
            if (!is_committed) {
                cancel_drag(drag_shape)
            }
            drag_shape = undefined
        }
    }

    fg_shapes.forEach(shape => update_shape(shape, delta))

    fg_tiles.forEach(_ => {
        if (_[2] === 1) {
            _[2] = 0
        }
    })

    if (drag_shape) {
        const shape = drag_shape
        drag_shape.tiles.forEach(tile => {
            let min_fg_tile: XYWH | undefined
            let min_ratio: number | undefined
            fg_tiles.forEach((fg_tile) => {
                let ratio = box_intersect_ratio(tile_box(shape, tile), fg_box(fg_tile)).ratio_b
                if (fg_tile[2] === 0 && ratio > 0 && (min_ratio === undefined || ratio > min_ratio)) {
                    min_fg_tile = fg_tile
                    min_ratio = ratio
                }
            })
            if (min_fg_tile) {
                min_fg_tile[2] = 1
            }
        })
    }
}

function fg_box(tile: XYWH): XYWH {
    return [tile[0] + 6, tile[1] + 2, 14, 12]
}

function cancel_drag(shape: Shape) {
    shape.t_cancel = 200
    drag_decay = [0, 0]
    AudioContent.play('drop', false, 0.5)
}

function commit_drag(shape: Shape) {
    let pp = fg_tiles.filter(_ => _[2] === 1)
    if (pp.length !== shape.tiles.length) {
        return false
    }
    pp.forEach(_ => _[2] = 2)
    fg_shapes.splice(fg_shapes.indexOf(shape), 1)
    drag_decay = [0, 0]
    return true
}

function update_shape(shape: Shape, delta: number) {

    shape.t_cancel = appr(shape.t_cancel, 0, delta)
    shape.t_hovering = appr(shape.t_hovering, 0, delta)

    for (let i = 0; i < shape.tiles.length; i++) {
        let tile = shape.tiles[i]
        if (shape.t_hovering > 0) {
            tile[4] = t % 600 < 300 ? tile[0] : tile[2]
            tile[5] = t % 600 < 300 ? tile[1] : tile[3]
        }
    }

    if (shape.t_cancel > 0) {
        shape.pos[2] = lerp(shape.pos[2], shape.pos[0], ease(1 - shape.t_cancel / 200))
        shape.pos[3] = lerp(shape.pos[3], shape.pos[1], ease(1 - shape.t_cancel / 200))
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


function tile_box(shape: Shape, xywh: XYWHZZ): XYWH {
    return [shape.pos[2] + xywh[0] + 2, shape.pos[3] + xywh[1] + 2, 12, 12]
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
        if (fg_tiles[i][2] === 2) {
            c.image(fg_tiles[i][0], fg_tiles[i][1], 24, 16, 56, 48)
        } else if (fg_tiles[i][2] === 1) {
            c.image(fg_tiles[i][0], fg_tiles[i][1], 24, 16, 56, 16)
        } else {
            c.image(fg_tiles[i][0], fg_tiles[i][1], 24, 16, 56, 0)
        }

        if (false) {
            c.rect(...fg_box(fg_tiles[i]), 'red')
        }

        if (i % 2 === 0) {
            c.image(fg_tiles[i][0] + 8, fg_tiles[i][1] + 5, 32, 24, 88, 16)
        }
    }

    for (let slot = 0; slot < fg_shapes.length; slot++) {
        if (fg_shapes[slot] !== drag_shape) {
            render_shape(fg_shapes[slot])
        }
    }



    c.image(0, 0, 80, 45, 0, 80)


    if (drag_shape) {
        render_shape(drag_shape)
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


}

function render_shape(shape: Shape) {
    let tiles = shape.tiles

    for (let i = 0; i < tiles.length; i++) {
        let [hx, hy] = [shape.pos[2], shape.pos[3]]
        if (shape.t_hovering > 0) {
            c.image(hx + tiles[i][4], hy + tiles[i][5], 16, 16, 0, 0)

            c.image(hx + tiles[i][4], hy + tiles[i][5], 16, 16, ...auto_tile_src(tiles, i))
        } else {
            c.image(hx + tiles[i][0], hy + tiles[i][1], 16, 16, 0, 0)
        }

        //c.rect(...tile_box(tiles[i]), 'red')
    }
}

function auto_tile_src(tiles: XYWHZZ[], i: number): XY {
    const auto_tiles: Record<string, XY> = {
        'left_top': [16, 32],
        'left_bottom': [16, 16],
        'right_top': [0, 32],
        'right_bottom': [0, 16],
    }

    let [x, y] = [tiles[i][0], tiles[i][1]]


    let [left_x, right_x] = [x - 14, x + 14]
    let [top_y, bottom_y] = [y - 13, y + 13]

    let left = tiles.find(_ => _[0] === left_x && _[1] === y)
    let right = tiles.find(_ => _[0] === right_x && _[1] === y)
    let top = tiles.find(_ => _[0] === x && _[1] === top_y)
    let bottom = tiles.find(_ => _[0] === x && _[1] === bottom_y)

    if (left && top) {
        return auto_tiles['left_top']
    }

    if (right && top) {
        return auto_tiles['right_top']
    }

    if (left && bottom) {
        return auto_tiles['left_bottom']
    }

    if (right && bottom) {
        return auto_tiles['right_bottom']
    }

    return [0, 0]
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