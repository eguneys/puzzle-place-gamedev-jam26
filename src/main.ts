import { Loop } from './loop_input'
import './style.css'
import { _init, _render, _update } from './ur.ts'
import { c } from './canvas'
import AudioContent from './audio'


async function load_font(font_family: string, url: string, props = {
    style: 'normal',
    weight: '400'
}) {
    const font = new FontFace(font_family, `url(${url})`, props )
    await font.load()
    document.fonts.add(font)
}


function app(el: HTMLElement) {



  Promise.all([
    c.load_sheet(),
    AudioContent.load(),
    load_font('HDLoreFont', './PTSerif-Regular.ttf')
  ]).then(() => {

    _init()

    Loop(_update, _render)
  })

  c.canvas.classList.add('pixelated')


  let content = document.createElement('div')
  content.classList.add('content')

  content.appendChild(c.canvas)
  el.appendChild(content)
}


app(document.querySelector('#app')!)