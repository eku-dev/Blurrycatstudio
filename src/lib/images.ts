// All imagery is from Unsplash (free to use under the Unsplash License).
// Swap these for the studio's own renders and case-study photography.
const base = 'https://images.unsplash.com/photo-'

export const img = (id: string, w = 1200) => `${base}${id}?w=${w}&q=75&auto=format&fit=crop`
export const srcSet = (id: string, widths = [640, 1000, 1600]) =>
  widths.map((w) => `${img(id, w)} ${w}w`).join(', ')

export const IMG = {
  archInterior: '1567016376408-0226e4d0c1ea',
  architecture: '1487958449943-2429e8be8625',
  sageLamp: '1494438639946-1ebd1d20bf85',
  catTable: '1501820488136-72669149e0d4',
  catStairs: '1495360010541-f48722b34f7d',
  catNoir: '1478098711619-5ab0b478d6e6',
  watch: '1523275335684-37898b6baf30',
  shoeWhite: '1491553895911-0055eca6402d',
  shoeRed: '1542291026-7eec264c27ff',
  micDark: '1590602847861-f357a9332bbc',
  micStudio: '1478737270239-2f02b77fc618',
  swatches: '1561070791-2526d30994b5',
  sunglasses: '1572635196237-14b3f281503f',
  polaroid: '1526170375885-4d8ecf77b99f',
  drafting: '1503387762-592deb58ef4e',
  chair: '1592078615290-033ee584e267',
  yellowChair: '1586023492125-27b2c045efd7',
  house: '1600585154340-be6161a56a0c',
  towers: '1511818966892-d7d671e672a2',
  headphones: '1583394838336-acd977736f90',
  render: '1652953373910-4a166631a3a6',
  circuit: '1535136104956-115a2cd67fc4',
  shapes: '1604782206219-3b9576575203',
  sphere: '1653299181802-5d1282fa5eac',
  marble: '1667400104789-f50a4cb393cf',
} as const
