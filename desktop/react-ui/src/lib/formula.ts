export class FormulaError extends Error {}

type Vars = Record<string, number>

interface Token {
  kind: 'num' | 'name' | 'op'
  value: string
}

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  sqrt: (a) => Math.sqrt(a[0]),
  log: (a) => Math.log10(a[0]),
  ln: (a) => Math.log(a[0]),
  exp: (a) => Math.exp(a[0]),
  abs: (a) => Math.abs(a[0]),
  pow: (a) => Math.pow(a[0], a[1]),
  mod: (a) => a[0] % a[1],
  round: (a) => Math.round(a[0]),
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (/[0-9]/.test(c) || (c === '.' && i + 1 < src.length && /[0-9]/.test(src[i + 1]))) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      if (j < src.length && (src[j] === 'e' || src[j] === 'E')) {
        let k = j + 1
        if (k < src.length && (src[k] === '+' || src[k] === '-')) k++
        if (k < src.length && /[0-9]/.test(src[k])) {
          k++
          while (k < src.length && /[0-9]/.test(src[k])) k++
          j = k
        }
      }
      const num = Number(src.slice(i, j))
      if (Number.isNaN(num)) throw new FormulaError(`invalid number at ${i}`)
      tokens.push({ kind: 'num', value: String(num) })
      i = j
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++
      tokens.push({ kind: 'name', value: src.slice(i, j) })
      i = j
      continue
    }
    if ('+-*/^(),'.includes(c)) {
      tokens.push({ kind: 'op', value: c })
      i++
      continue
    }
    throw new FormulaError(`unexpected character "${c}"`)
  }
  return tokens
}

class Parser {
  private pos = 0
  constructor(
    private tokens: Token[],
    private vars: Vars,
  ) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private next(): Token {
    const t = this.tokens[this.pos]
    if (!t) throw new FormulaError('unexpected end of formula')
    this.pos++
    return t
  }

  private expect(op: string) {
    const t = this.next()
    if (t.kind !== 'op' || t.value !== op) throw new FormulaError(`expected "${op}"`)
  }

  parse(): number {
    const v = this.parseExpr()
    if (this.pos < this.tokens.length) throw new FormulaError('unexpected token')
    if (!Number.isFinite(v)) throw new FormulaError('result is not a finite number')
    return v
  }

  private parseExpr(): number {
    let v = this.parseTerm()
    for (;;) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.pos++
        const r = this.parseTerm()
        v = t.value === '+' ? v + r : v - r
      } else {
        return v
      }
    }
  }

  private parseTerm(): number {
    let v = this.parseUnary()
    for (;;) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/')) {
        this.pos++
        const r = this.parseUnary()
        if (t.value === '/') {
          if (r === 0) throw new FormulaError('division by zero')
          v = v / r
        } else {
          v = v * r
        }
      } else {
        return v
      }
    }
  }

  private parseUnary(): number {
    const t = this.peek()
    if (t?.kind === 'op' && t.value === '-') {
      this.pos++
      return -this.parseUnary()
    }
    if (t?.kind === 'op' && t.value === '+') {
      this.pos++
      return this.parseUnary()
    }
    return this.parsePower()
  }

  private parsePower(): number {
    const base = this.parsePrimary()
    const t = this.peek()
    if (t?.kind === 'op' && t.value === '^') {
      this.pos++
      const exp = this.parseUnary()
      return Math.pow(base, exp)
    }
    return base
  }

  private parsePrimary(): number {
    const t = this.next()
    if (t.kind === 'num') return Number(t.value)
    if (t.kind === 'name') {
      const fn = this.peek()
      if (fn?.kind === 'op' && fn.value === '(') {
        const f = FUNCTIONS[t.value.toLowerCase()]
        if (!f) throw new FormulaError(`unknown function "${t.value}"`)
        this.pos++
        const args: number[] = []
        if (!(this.peek()?.kind === 'op' && this.peek()?.value === ')')) {
          for (;;) {
            args.push(this.parseExpr())
            const sep = this.peek()
            if (sep?.kind === 'op' && sep.value === ',') {
              this.pos++
              continue
            }
            break
          }
        }
        this.expect(')')
        return f(args)
      }
      if (!(t.value in this.vars)) throw new FormulaError(`unknown parameter "${t.value}"`)
      return this.vars[t.value]
    }
    if (t.kind === 'op' && t.value === '(') {
      const v = this.parseExpr()
      this.expect(')')
      return v
    }
    throw new FormulaError(`unexpected token "${t.value}"`)
  }
}

export function evaluate(formula: string, vars: Vars = {}): number {
  const src = formula.trim()
  if (!src) throw new FormulaError('empty formula')
  return new Parser(tokenize(src), vars).parse()
}

export type EvalResult = { ok: true; value: number } | { ok: false; error: string }

export function tryEvaluate(formula: string, vars: Vars = {}): EvalResult {
  try {
    return { ok: true, value: evaluate(formula, vars) }
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e) }
  }
}

export function isPlainNumber(s: string): boolean {
  return /^-?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$/.test(s.trim())
}
