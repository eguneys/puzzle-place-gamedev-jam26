import sheet_png from '../design/sheet.png'

type Canvas = {
  canvas: HTMLCanvasElement
  rect(x: number, y: number, w: number, h: number, color: Color): void
  clear(): void
  set_transform(x: number, y: number): void
  reset_transform(): void
  image(x: number, y: number, w: number, h: number, sx: number, sy: number): void
  load_sheet(): Promise<void>
}

type Color = string

function Canvas(width: number, height: number): Canvas {

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    function rect(x: number, y: number, width: number, height: number, color: Color) {
        x = Math.floor(x)
        y = Math.floor(y)
        ctx.fillStyle = color
        ctx.fillRect(x, y, width, height)
    }

    function clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    function set_transform(x: number, y: number) {
        x = Math.floor(x)
        y = Math.floor(y)
        ctx.setTransform(1, 0, 0, 1, x, y)
    }

    function reset_transform() {
        ctx.resetTransform()
    }

    let sheet = new Image()

    function load_sheet() {
        sheet.src = sheet_png
        return new Promise<void>(resolve => {
            sheet.onload = () => resolve()
        })
    }

    function image(x: number, y: number, w: number, h: number, sx: number, sy: number) {
        x = Math.floor(x)
        y = Math.floor(y)
        ctx.drawImage(sheet, sx, sy, w, h, x, y, w, h)
    }

    return {
      canvas,
      clear,
      rect,
      image,
      set_transform,
      reset_transform,
      load_sheet
    }
}

export let c: Canvas = Canvas(160, 90)

