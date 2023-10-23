window.onload = () => {
    const STATE = {
        count:      0,          // # of games loaded
        state:      undefined,  // {"normal", "hover", "pressed", "lost", "win"}
        running:    undefined,  // true if clock running
        bomb_value: undefined,  // # of bombs minus # of flags
        time_value: undefined,  // time since start
        cell:  undefined,  // 2D array, object:
        // .bomb  : # of adjacent bombs (or -1 if bomb)
        // .state : {"cover", "reveal", "flag", "hover"}
    };
    const DOM = {};
    const ID = ["select", "face", "board", "game", "dash", "time"];
    for (const id of ["bomb", "time"]) {
        for (let i = 0; i < 3; ++i) {
            ID.push(`${id}_digit_${i}`);
        }
    }
    for (const id of ID) {
        DOM[id] = document.getElementById(id);
    }
    DOM.face.onmousedown = () => update_face(DOM, STATE, "down");
    DOM.face.onmouseup   = () => update_face(DOM, STATE, "up");
    DOM.face.onmouseout  = () => update_face(DOM, STATE, "out");
    DOM.face.ontouchend  = () => update_face(DOM, STATE, "touch");
    document.onmouseup = () => {
        if (STATE.state == "hover") {
            STATE.state = "normal";
            update_draw(DOM, STATE);
        }
    };
    document.oncontextmenu = (e) => e.preventDefault();
    make_graphics();
    DOM.select.onchange = (e) => reset(DOM, STATE);
    reset(DOM, STATE);
};

const update_face = (DOM, STATE, type) => {
    switch (type) {
        case "down":
            if (STATE.state == "normal") { STATE.state = "pressed"; }
            break;
        case "out":
            if (STATE.state == "pressed") { STATE.state = "normal"; }
            break;
        case "up":
            if (STATE.state != "pressed") { break; }
        case "touch":
            reset(DOM, STATE);
    }
    update_draw(DOM, STATE);
};

const reset = (DOM, STATE) => {
    const [nx, ny, nb] = LEVELS[DOM.select.value];
    const [w, h] = [8*nx, 16*ny];
    for (const [d, a, l] of [           // resize board graphics
        [ "game",  "width", 2*w + 22],
        [ "game", "height",   h + 72],
        ["board",  "width",      2*w],
        ["board", "height",        h],
        [ "dash",  "width",      2*w],
        [ "face",   "left",   w - 13],
        [ "time",   "left", 2*w - 48],
    ]) {
        DOM[d].style[a] = `${l}px`;
    }
    STATE.state = "normal";
    STATE.count += 1;
    STATE.running = false;
    STATE.bomb_value = nb;
    STATE.time_value = 0;
    STATE.cell = Array(ny).fill(0).map(() => Array(nx));
    for (let y = 0; y < ny; ++y) {
        for (let x = 0; x < nx; ++x) {
            STATE.cell[y][x] = {bomb: 0, state: "cover", div: undefined};
        }
    }
    const n = nx*ny;
    const B = Array(n).fill(0).map((_, i) => (i < nb) ? -1 : 0);
    for (let i = 0; i < nb; ++i) {
        const j = i + Math.floor(Math.random()*(n - i));
        [B[i], B[j]] = [B[j], B[i]];
    }
    for (let y = 0; y < ny; ++y) {
        for (let x = 0; x < nx; ++x) {
            const b = B[nx*y + x];
            if (b == -1) {
                STATE.cell[y][x].bomb = b;
                for (const dy of [-1, 0, 1]) {
                    for (const dx of [-1, 0, 1]) {
                        const [x2, y2] = [x + dx, y + dy];
                        if ((0 <= x2) && (x2 < nx) &&
                            (0 <= y2) && (y2 < ny) &&
                            (STATE.cell[y2][x2].bomb != -1)
                        ) {
                            STATE.cell[y2][x2].bomb += 1;
                        }
                    }
                }
            }
        }
    }
    while (DOM.board.children.length > 0) {
        DOM.board.children[0].remove();
    }
    for (let y = 0; y < ny; ++y) {
        for (let x = 0; x < nx; ++x) {
            const div = document.createElement("div");
            DOM.board.append(div);
            STATE.cell[y][x].div = div;
            div.style.top    = `${y*16}px`;
            div.style.left   = `${x*16}px`;
            div.onmousedown = (e) => update_board(DOM, STATE, e, [x, y]);
            div.onmouseout  = (e) => update_board(DOM, STATE, e, [x, y]);
            div.onmouseover = (e) => update_board(DOM, STATE, e, [x, y]);
            div.onmouseup   = (e) => update_board(DOM, STATE, e, [x, y]);
            div.ontouchend  = (e) => update_board(DOM, STATE, e, [x, y]);
        }
    }
    update_timer(DOM, STATE, STATE.count);
};

const set_display = (DOM, id, val) => {
    for (let i = 2; i >= 0; --i) {
        const d = val % 10;
        DOM[`${id}_digit_${i}`].className = `d${d}`;
        val = (val - d)/10;
    }
};

const update_draw = (DOM, STATE) => {
    set_display(DOM, "time", STATE.time_value);
    set_display(DOM, "bomb", STATE.bomb_value);
    DOM.face.className = STATE.state;
    for (const row of STATE.cell) {
        for (const cell of row) {
            let {bomb, state, div} = cell;
            switch (state) {
                case "hover":   state = "t0";   break;
                case "flag":    state = "flag"; break;
                case "reveal":  state = (bomb == -1) ? "bomb" : `t${bomb}`;
            }
            div.className = state;
        }
    }
};

const update_timer = (DOM, STATE, count) => {
    if (STATE.count != count) { return; }
    if (STATE.running) {
        STATE.time_value += 1;
        if (STATE.time_value == 999) {
            STATE.count += 1;
            STATE.state = "lost";
        } else {
            window.setTimeout((() => update_timer(DOM, STATE, count)), 1);
        }
    }
    update_draw(DOM, STATE);
};

// kill = () ->
//   for y1 in [0...G.ny]
//     for x1 in [0...G.nx]
//       if G.state[y1][x1] == "bomb"
//         G.status[y1][x1] = "bomb"
//       else if G.status[y1][x1] == "flag"
//         G.status[y1][x1] = "wrong"
//   G.face_state = "lost"
//   G.bomb_data.value = 0

const make_graphics = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const style = document.createElement("style");
    style.innerHTML = Object.entries(ICONS).map(([k, icon]) => {
        const L = icon.split("\n");
        const h = L.length;
        const w = L[0].length;
        canvas.width = w;
        canvas.height = h;
        const img = ctx.createImageData(w, h);
        const data = img.data
        for (let y = 0; y < h; ++y) {
            const line = L[y];
            for (let x = 0; x < w; ++x) {
                const p = line[x];
                const color = ICON_COLORS[p];
                const i = (w*y + x) << 2;
                for (const d of [0, 1, 2, 3]) {
                    data[i + d] = color[d];
                }
            }
        }
        ctx.putImageData(img, 0, 0);
        const uri = canvas.toDataURL('image/png');
        return `
.${k} {
    width: ${w}px;
    height: ${h}px;
    background-image: url(${uri});
}`;
    }).join("\n");
    document.head.appendChild(style);
};

const update_board = (DOM, STATE, e, [x, y]) => {
    const {type, button} = e;
    if ((button == 2) && (type != "mousedown")) { return; }
    if ((STATE.state == "win") || (STATE.state == "lost")) { return; }
    const cell = STATE.cell[y][x];
    switch (type) {
        case "mousedown":
            if (button == 2) {
                if (!STATE.running) { return; }
                switch (cell.state) {
                    case "cover": cell.state =  "flag"; break;
                    case "flag":  cell.state = "cover"; break;
                }
            } else {
                if ((STATE.state == "normal") && (cell.state == "cover")) {
                    STATE.state = "hover";
                    cell.state = "hover";
                }
            }
            break;
        case "mouseover":
            if ((STATE.state == "hover") && (cell.state == "cover")) {
                cell.state = "hover";
            }
            break;
        case "mouseout":
            if ((STATE.state == "hover") && (cell.state == "hover")) {
                cell.state = "cover";
            }
            break;
        case "mouseup":
            if (STATE.state != "hover") { break; }
        case "touchend":
            if (!STATE.running) {
                STATE.running = true;
                update_timer(DOM, STATE, STATE.count);
            }
            STATE.state = "normal";
            cell.state = "reveal";
    }
    update_draw(DOM, STATE);
};


/*

G = {};
MOUSE_BUTTON = { left: 0, right: 2 };



update_board = (type, e, [x, y]) ->
  # type in ["up", "down", "over"]
  # button in ["face", "body"] or [x, y]
  # face_state in ["normal", "pressed", "hover", "lost", "win"]
  # status in ["reveal", "cover", "flag", "bomb", "explode", "wrong"]
  # state in [0..8] or "bomb"
  e.preventDefault()
  e.stopPropagation()
  if G.face_state in ["win", "lost"]
    return                        # game over, no more clicks
  G.hover = [x, y]
  if type == "over"
    if G.face_state == "hover"
      update_draw()
    return
  status = G.status[y][x]
  if type == "down"               # clicked down on a square
    if (e.button == MOUSE_BUTTON.right) and G.running
      if status == "flag"
        G.status[y][x] = "cover"
        G.bomb_data.value += 1
      if status == "cover"
        G.status[y][x] = "flag"
        G.bomb_data.value -= 1
    if (e.button == MOUSE_BUTTON.left) and (G.status[y][x] == "cover")
      G.face_state = "hover"
    update_draw()
    return
  # up or touch event
  if (type == "up" and G.face_state != "hover") or (status != "cover")
    return                        # didn't click up on a covered square
  # clicked on covered square while surprised
  if not G.running                # start timer
    G.running = true
    update_timer()
  G.status[y][x] = "reveal"
  if G.state[y][x] == "bomb"      # uh oh, clicked on a bomb! :(
    kill()
    G.status[y][x] = "explode"
    update_draw()
    return
  if G.state[y][x] == 0           # clicked blank, explore surrounding
    queue = [[x, y]]
    while queue.length > 0 
      [x1, y1] = queue.pop()
      G.status[y1][x1] = "reveal"
      if G.state[y1][x1] == 0
        for dy in [-1,0,1]
          for dx in [-1,0,1]
            [x2, y2] = [x1 + dx, y1 + dy]
            if (((dx != 0) or (dy != 0)) and
                (0 <= x2 < G.nx) and (0 <= y2 < G.ny) and
                G.status[y2][x2] in ["cover", "flag"])
              queue.push([x2, y2])
  G.face_state = "win"            # check if won
  for y in [0...G.ny]
    for x in [0...G.nx]
      if (G.state[y][x] != "bomb") and (G.status[y][x] != "reveal")
        G.face_state = "normal"
  if G.face_state == "win"        # you won! fill in flags
    for y in [0...G.ny]
      for x in [0...G.nx]
        if G.state[y][x] == "bomb"
          G.status[y][x] = "flag"
    G.bomb_data.value = 0
  update_draw()
*/

const STYLES = {
    body:   {background: "#BDBDBD"},
    select: {width: "100px"},
    cell:   {width: "16px", height: "16px"},
    digit:  {width: "13px", height: "23px"},
    face:   {width: "26px", height: "26px", top: "5px"},
    board:  {top: "58px", left: "8px", border: "3px inset #DDD"},
    game:   {top: "35px", left: "5px", border: "3px outset #DDD"},
    dashboard: {
        top: "8px", left: "8px", height: "36px",
        border: "3px inset #DDD"
    },
    bomb: {
        top: "4px", width: "39px", height: "23px",
        border: "2px inset #DDD", background: "black"
    },
    time: {
        top: "4px", width: "39px", height: "23px",
        border: "2px inset #DDD", background: "black"
    },
};

const LEVELS = {
    beginner:     [ 9,  9, 10],
    intermediate: [16, 16, 40],
    expert:       [30, 16, 99],
};

const COLORS = {
    clear:      [  0,  0,  0,  0],
    black:      [  0,  0,  0,255],
    white:      [255,255,255,255],
    gray:       [123,123,123,255],
    lightgray:  [189,189,189,255],
    red:        [255,  0,  0,255],
    darkred:    [123,  0,  0,255],
    yellow:     [255,255,  0,255],
    blue:       [  0,  0,255,255],
    green:      [  0,123,  0,255],
    darkblue:   [  0,  0,123,255],
    teal:       [  0,123,123,255],
};

const ICON_COLORS = {
    ",": COLORS.white,
    "#": COLORS.black,
    ".": COLORS.clear,
    "*": COLORS.gray,
    "+": COLORS.red,
    "-": COLORS.darkred,
    "'": COLORS.yellow,
    "1": COLORS.blue,
    "2": COLORS.green,
    "3": COLORS.red,
    "4": COLORS.darkblue,
    "5": COLORS.darkred,
    "6": COLORS.teal,
    "7": COLORS.black,
    "8": COLORS.gray,
};

const ICONS = {
    t0: `\
****************
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............
*...............`,
    t1: `\
****************
*...............
*...............
*.......11......
*......111......
*.....1111......
*....11111......
*......111......
*......111......
*......111......
*......111......
*....1111111....
*....1111111....
*...............
*...............
*...............`,
    t2: `\
****************
*...............
*...............
*...22222222....
*..2222222222...
*..222....222...
*.........222...
*.......2222....
*.....22222.....
*...22222.......
*..2222.........
*..2222222222...
*..2222222222...
*...............
*...............
*...............`,
    t3: `\
****************
*...............
*...............
*..333333333....
*..3333333333...
*.........333...
*.........333...
*.....333333....
*.....333333....
*.........333...
*.........333...
*..3333333333...
*..333333333....
*...............
*...............
*...............`,
    t4: `\
****************
*...............
*...............
*....444.444....
*....444.444....
*...444..444....
*...444..444....
*..4444444444...
*..4444444444...
*........444....
*........444....
*........444....
*........444....
*...............
*...............
*...............`,
    t5: `\
****************
*...............
*...............
*..5555555555...
*..5555555555...
*..555..........
*..555..........
*..555555555....
*..5555555555...
*.........555...
*.........555...
*..5555555555...
*..555555555....
*...............
*...............
*...............`,
    t6: `\
****************
*...............
*...............
*...66666666....
*..666666666....
*..666..........
*..666..........
*..666666666....
*..666666666....
*..666....666...
*..666....666...
*..6666666666...
*...66666666....
*...............
*...............
*...............`,
    t7: `\
****************
*...............
*...............
*..7777777777...
*..7777777777...
*.........777...
*.........777...
*........777....
*........777....
*.......777.....
*.......777.....
*......777......
*......777......
*...............
*...............
*...............`,
    t8: `\
****************
*...............
*...............
*...88888888....
*..8888888888...
*..888....888...
*..888....888...
*...88888888....
*...88888888....
*..888....888...
*..888....888...
*..8888888888...
*...88888888....
*...............
*...............
*...............`,
    cover: `\
,,,,,,,,,,,,,,,.
,,,,,,,,,,,,,,.*
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,,............**
,.**************
.***************`,
    flag: `\
,,,,,,,,,,,,,,,.
,,,,,,,,,,,,,,.*
,,............**
,,.....++.....**
,,...++++.....**
,,..+++++.....**
,,...++++.....**
,,.....++.....**
,,......#.....**
,,......#.....**
,,....####....**
,,..########..**
,,..########..**
,,............**
,.**************
.***************`,
    bomb: `\
****************
*...............
*.......#.......
*.......#.......
*...#.#####.#...
*....#######....
*...##,,#####...
*...##,,#####...
*.#############.
*...#########...
*...#########...
*....#######....
*...#.#####.#...
*.......#.......
*.......#.......
*...............`,
    wrong: `\
****************
*...............
*.......#.......
*.++....#....++.
*..++.#####.++..
*...++#####++...
*...#++,##++#...
*...##++#++##...
*.#####+++#####.
*...###+++###...
*...##++#++##...
*....++###++....
*...++#####++...
*..++...#...++..
*.++....#....++.
*...............`,
    explode: `\
****************
*+++++++++++++++
*+++++++#+++++++
*+++++++#+++++++
*+++#+#####+#+++
*++++#######++++
*+++##,,#####+++
*+++##,,#####+++
*+#############+
*+++#########+++
*+++#########+++
*++++#######++++
*+++#+#####+#+++
*+++++++#+++++++
*+++++++#+++++++
*+++++++++++++++`,
    d0: `\
.............
..+++++++++..
.+.+++++++.+.
.++.+++++.++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.......++.
.+..-.-.-..+.
...-.-.-.-...
.+..-.-.-..+.
.++.......++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.+++++.++.
.+.+++++++.+.
..+++++++++..
.............`,
    d1: `\
.............
...-.-.-.-...
.-..-.-.-..+.
..-..-.-..++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.......++.
.-..-.-.-..+.
...-.-.-.-...
.-..-.-.-..+.
..-.......++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-..-.-..++.
.-..-.-.-..+.
...-.-.-.-...
.............`,
    d2: `\
.............
..+++++++++..
.-.+++++++.+.
..-.+++++.++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.......++.
.-.+++++++.+.
..+++++++++..
.+.+++++++.-.
.++.......-..
.+++.....-.-.
.+++......-..
.+++.....-.-.
.+++......-..
.+++.....-.-.
.++.+++++.-..
.+.+++++++.-.
..+++++++++..
.............`,
    d3: `\
.............
..+++++++++..
.-.+++++++.+.
..-.+++++.++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.......++.
.-.+++++++.+.
..+++++++++..
.-.+++++++.+.
..-.......++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.+++++.++.
.-.+++++++.+.
..+++++++++..
.............`,
    d4: `\
.............
...-.-.-.-...
.+..-.-.-..+.
.++..-.-..++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.......++.
.+.+++++++.+.
..+++++++++..
.-.+++++++.+.
..-.......++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-..-.-..++.
.-..-.-.-..+.
...-.-.-.-...
.............`,
    d5: `\
.............
..+++++++++..
.+.+++++++.-.
.++.+++++.-..
.+++.....-.-.
.+++......-..
.+++.....-.-.
.+++......-..
.+++.....-.-.
.++.......-..
.+.+++++++.-.
..+++++++++..
.-.+++++++.+.
..-.......++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.+++++.++.
.-.+++++++.+.
..+++++++++..
.............`,
    d6: `\
.............
..+++++++++..
.+.+++++++.-.
.++.+++++.-..
.+++.....-.-.
.+++......-..
.+++.....-.-.
.+++......-..
.+++.....-.-.
.++.......-..
.+.+++++++.-.
..+++++++++..
.+.+++++++.+.
.++.......++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.+++++.++.
.+.+++++++.+.
..+++++++++..
.............`,
    d7: `\
.............
..+++++++++..
.-.+++++++.+.
..-.+++++.++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.......++.
.-..-.-.-..+.
...-.-.-.-...
.-..-.-.-..+.
..-.......++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-..-.-..++.
.-..-.-.-..+.
...-.-.-.-...
.............`,
    d8: `\
.............
..+++++++++..
.+.+++++++.+.
.++.+++++.++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.......++.
.+.+++++++.+.
..+++++++++..
.+.+++++++.+.
.++.......++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.+++++.++.
.+.+++++++.+.
..+++++++++..
.............`,
    d9: `\
.............
..+++++++++..
.+.+++++++.+.
.++.+++++.++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.+++.....+++.
.++.......++.
.+.+++++++.+.
..+++++++++..
.-.+++++++.+.
..-.......++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-......+++.
.-.-.....+++.
..-.+++++.++.
.-.+++++++.+.
..+++++++++..
.............`,
    d10: `\
.............
...-.-.-.-...
.-..-.-.-..-.
..-..-.-..-..
.-.-.....-.-.
..-.......-..
.-.-.....-.-.
..-.......-..
.-.-.....-.-.
..-.......-..
.-.+++++++.-.
..+++++++++..
.-.+++++++.-.
..-.......-..
.-.-.....-.-.
..-.......-..
.-.-.....-.-.
..-.......-..
.-.-.....-.-.
..-..-.-..-..
.-..-.-.-..-.
...-.-.-.-...
.............`,
    normal: `\
*************************.
*,,,,,,,,,,,,,,,,,,,,,,,.*
*,,,,,,,,,,,,,,,,,,,,,,.**
*,,....................***
*,,....................***
*,,........#####.......***
*,,......##'''''##.....***
*,,.....#'''''''''#....***
*,,....#'''''''''''#...***
*,,...#'''''''''''''#..***
*,,...#'''##'''##'''#..***
*,,..#''''##'''##''''#.***
*,,..#'''''''''''''''#.***
*,,..#'''''''''''''''#.***
*,,..#'''''''''''''''#.***
*,,..#'''#'''''''#'''#.***
*,,...#'''#'''''#'''#..***
*,,...#''''#####''''#..***
*,,....#'''''''''''#...***
*,,.....#'''''''''#....***
*,,......##'''''##.....***
*,,........#####.......***
*,,....................***
*,.***********************
*.************************
.*************************`,
    pressed: `\
*************************.
**************************
**.......................*
**.......................*
**.......................*
**.......................*
**..........#####........*
**........##'''''##......*
**.......#'''''''''#.....*
**......#'''''''''''#....*
**.....#'''''''''''''#...*
**.....#'''##'''##'''#...*
**....#''''##'''##''''#..*
**....#'''''''''''''''#..*
**....#'''''''''''''''#..*
**....#'''''''''''''''#..*
**....#'''#'''''''#'''#..*
**.....#'''#'''''#'''#...*
**.....#''''#####''''#...*
**......#'''''''''''#....*
**.......#'''''''''#.....*
**........##'''''##......*
**..........#####........*
**.......................*
**.......................*
.*************************`,
    hover: `\
*************************.
*,,,,,,,,,,,,,,,,,,,,,,,.*
*,,,,,,,,,,,,,,,,,,,,,,.**
*,,....................***
*,,....................***
*,,........#####.......***
*,,......##'''''##.....***
*,,.....#'''''''''#....***
*,,....#'''''''''''#...***
*,,...#''*#*'''*#*''#..***
*,,...#''###'''###''#..***
*,,..#'''*#*'''*#*'''#.***
*,,..#'''''''''''''''#.***
*,,..#'''''''''''''''#.***
*,,..#''''''###''''''#.***
*,,..#'''''*#'#*'''''#.***
*,,...#''''#'''#''''#..***
*,,...#''''*#'#*''''#..***
*,,....#''''###''''#...***
*,,.....#'''''''''#....***
*,,......##'''''##.....***
*,,........#####.......***
*,,....................***
*,.***********************
*.************************
.*************************`,
    lost: `\
*************************.
*,,,,,,,,,,,,,,,,,,,,,,,.*
*,,,,,,,,,,,,,,,,,,,,,,.**
*,,....................***
*,,....................***
*,,........#####.......***
*,,......##'''''##.....***
*,,.....#'''''''''#....***
*,,....#'''''''''''#...***
*,,...#''#'#'''#'#''#..***
*,,...#'''#'''''#'''#..***
*,,..#'''#'#'''#'#'''#.***
*,,..#'''''''''''''''#.***
*,,..#'''''''''''''''#.***
*,,..#'''''''''''''''#.***
*,,..#'''''#####'''''#.***
*,,...#'''#'''''#'''#..***
*,,...#''#'''''''#''#..***
*,,....#'''''''''''#...***
*,,.....#'''''''''#....***
*,,......##'''''##.....***
*,,........#####.......***
*,,....................***
*,.***********************
*.************************
.*************************`,
    win: `\
*************************.
*,,,,,,,,,,,,,,,,,,,,,,,.*
*,,,,,,,,,,,,,,,,,,,,,,.**
*,,....................***
*,,....................***
*,,........#####.......***
*,,......##'''''##.....***
*,,.....#'''''''''#....***
*,,....#'''''''''''#...***
*,,...#'''''''''''''#..***
*,,...#'''''''''''''#..***
*,,..#''###########''#.***
*,,..#'#'####'####'#'#.***
*,,..##''####'####''##.***
*,,..#'''*##'''##*'''#.***
*,,..#'''''''''''''''#.***
*,,...#'''''''''''''#..***
*,,...#'''#'''''#'''#..***
*,,....#'''#####'''#...***
*,,.....#'''''''''#....***
*,,......##'''''##.....***
*,,........#####.......***
*,,....................***
*,.***********************
*.************************
.*************************`,
};
