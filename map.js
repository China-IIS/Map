const ZOOM_SENSIVITY = 0.2;

const GRID_SIZE_THRESHOLD = 500;

const LINE_HOVER_THRESHOLD = 15;

const HIGHWAY_WIDTH = 4.5;

const STATES = {
    planned: {
        name: "计划中",
        color: [185, 85, 25]
    },
    main_axis_dug_narrow: {
        name: "直角公路窄挖 (2 宽, 4 高)",
        color: [71, 85, 40]
    },
    main_axis_dug_wide: {
        name: "直角公路宽挖 (6 宽, 4 高)",
        color: [38, 85, 40]
    },
    main_axis_paved: {
        name: "直角公路铺砌 (6 宽, 4 高)",
        color: [9, 85, 40]
    },
    diagonal_dug_narrow: {
        name: "对角线公路窄挖 (3 宽, 4 高)",
        color: [71, 85, 40]
    },
    diagonal_dug_wide: {
        name: "对角线公路宽挖 (9 宽, 4 高)",
        color: [38, 85, 40]
    },
    diagonal_paved: {
        name: "对角线公路铺砌 (9 宽, 4 高)",
        color: [9, 85, 40]
    }
}

/* Credits to Joshua at StackOverflow
   https://stackoverflow.com/a/6853926 */
function pDistanceSqrd(x, y, x1, y1, x2, y2) {
    let A = x - x1;
    let B = y - y1;
    let C = x2 - x1;
    let D = y2 - y1;
  
    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;
  
    let xx, yy;
  
    if (param < 0) {
      xx = x1;
      yy = y1;
    }
    else if (param > 1) {
      xx = x2;
      yy = y2;
    }
    else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
  
    let dx = x - xx;
    let dy = y - yy;
    return dx * dx + dy * dy;
}

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 0.4;
    }

    scale(x) {
        return x * this.zoom;
    }

    setSize(width, height) {
        this.width  = width;
        this.height = height;
    }

    getRect() {
        return {
            left:   this.x - this.width  / this.zoom / 2,
            right:  this.x + this.width  / this.zoom / 2,
            top:    this.y + this.height / this.zoom / 2,
            bottom: this.y - this.height / this.zoom / 2
        }
    }

    toScreen(x, y) {
        return [
            this.width  / 2 + (x - this.x) * this.zoom,
            this.height / 2 + (y - this.y) * this.zoom
        ];
    }

    toWorld(x, y)  {
        return [
            Math.round((x - this.width / 2)  / this.zoom + this.x),
            Math.round((y - this.height / 2) / this.zoom + this.y)
        ];
    }
}

class ServerAPI {
    async get(url) {
        let res = await fetch('/api' + url);
        res = await res.json();

        if (res.code == 200)
            return res.message;
        else
            throw res.error;
    }

    async post(url, data) {
        let res = await fetch('/api' + url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        res = await res.json();

        if (res.code == 200)
            return res.message;
        else
            throw res.error;
    }

    async getBlockages() {
        return await this.get('/blockages');
    }

    async getHighways() {
        let res = await fetch('/highways.json');
        res = await res.text();

        return JSON.parse(res.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m));
    }

    async getMonuments() {
        let res = await fetch('/monuments.json');
        res = await res.text();

        return JSON.parse(res.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m));
    }

    async submitBlockage(blockage) {
        return await this.post('/blockage', blockage);
    }
}

const serverApi = new ServerAPI();

function formatTime(time) {
    let date = new Date(time * 1000);

    return date.toLocaleDateString(navigator.language, {day: 'numeric', month: 'long', year: 'numeric'}) + ', ' + date.toLocaleTimeString(navigator.language, {hour: 'numeric', minute: 'numeric'});
}

class MapInfo {
    constructor(element) {
        this.elem = $(element);
        this.init();
    }

    init() {
        this.title = this.elem.find('#title');
        this.subtitle = this.elem.find('#subtitle');
        this.icon   = this.elem.find('#marker-icon');
        this.hwicon = this.elem.find('#hwicon');
        
        this.coordName  = this.elem.find('#coord-name');
        this.coordValue = this.elem.find('#coord-value');
        this.toName     = this.elem.find('#to-name');
        this.toValue    = this.elem.find('#to-value');

        this.userName   = this.elem.find('#user-name');
        this.userValue  = this.elem.find('#user-value');
        this.descName   = this.elem.find('#desc-name');
        this.descValue  = this.elem.find('#desc-value');
        this.dateName   = this.elem.find('#date-name');
        this.dateValue  = this.elem.find('#date-value');
        this.videoName   = this.elem.find('#video-name');
        this.videoValue  = this.elem.find('#video-value');
        
        this.newBlockage = this.elem.find('#new-blockage');
        this.inputForm   = this.elem.find('#input-form');
        this.inputTitle  = this.elem.find('#input-title');
        this.inputUser   = this.elem.find('#input-user');
        this.inputDesc   = this.elem.find('#input-desc');
        this.inputSubmit = this.elem.find('#input-submit');

        this.elem.find('#info-close').on('click', () => {
            this.elem.hide();
            this.closeCallback();
        });

        this.newBlockage.on('click', () => {
            this.newBlockage.hide();
            this.inputForm.show();
            this.inputTitle.focus();
        });

        this.inputSubmit.on('click', () => {
            let req = {
                title: this.inputTitle.val(),
                user: this.inputUser.val(),
                desc: this.inputDesc.val(),
                coords: this.marker
            };

            serverApi.submitBlockage(req)
                .then(() => {

                })
                .catch(e => {
                    alert(e);
                });
        });
    }

    setTitle(value) {
        if (value) {
            this.title.text(value);
            this.title.show();
        } else
            this.title.hide();
    }

    setSubtitle(value) {
        if (value) {
            this.subtitle.text(value);
            this.subtitle.show();
        } else
            this.subtitle.hide();
    }

    setUser(value) {
        if (value) {
            this.userValue.text(value);
            this.userName.show();
            this.userValue.show();
        } else {
            this.userName.hide();
            this.userValue.hide();
        }
    }

    setDescription(value) {
        if (value) {
            this.descName.text("DESCRIPTION");
            this.descValue.text(value);
            this.descValue.css('color', '');
            this.descName.show();
            this.descValue.show();
        } else {
            this.descName.hide();
            this.descValue.hide();
        }
    }

    setState(state) {
        if (state) {
            this.descName.text("STATE");
            this.descValue.text(state.name);
            this.descValue.css('color', '');
            this.descName.show();
            this.descValue.show();
        } else {
            this.descName.hide();
            this.descValue.hide();
        }
    }

    setDate(value) {
        if (value) {
            this.dateValue.text(formatTime(value));
            this.dateName.show();
            this.dateValue.show();
        } else {
            this.dateName.hide();
            this.dateValue.hide();
        }
    }

    setVideo(value) {
        if (value) {
            this.videoValue.empty();
            this.videoValue.append($(`
                <iframe src="https://www.youtube.com/embed/${value}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            `));
            this.videoName.show();
            this.videoValue.show();
        } else {
            this.videoName.hide();
            this.videoValue.hide();
        }
    }

    setCoord(value) {
        if (value) {
            this.coordName.text("COORDINATES");
            this.coordValue.text(value);
            this.coordName.show();
            this.coordValue.show();
            this.toName.hide();
            this.toValue.hide();
        } else {
            this.coordName.hide();
            this.coordValue.hide();
            this.toName.hide();
            this.toValue.hide();
        }
    }

    setFromTo(from, to) {
        if (from) {
            this.coordName.text("FROM");
            this.coordValue.text(from.join(', '));
            this.toValue.text(to.join(', '));
            this.coordName.show();
            this.coordValue.show();
            this.toName.show();
            this.toValue.show();
        } else {
            this.coordName.hide();
            this.coordValue.hide();
            this.toName.hide();
            this.toValue.hide();
        }
    }

    clearAll() {
        this.setTitle();
        this.setSubtitle();
        this.setUser();
        this.setDescription();
        this.setDate();
        this.setVideo();
        this.inputForm.hide();
        this.newBlockage.hide();
    }

    setMarker(x, y) {
        this.clearAll();

        this.hwicon.hide();
        this.icon.css('background-color', '');
        this.icon.show();
        this.setTitle('MARKER');
        this.setCoord(`${x}, ${y}`);
        this.newBlockage.show();
        this.elem.show();

        this.marker = [x, y];
    }

    setHighway(highway) {
        this.clearAll();

        let state = STATES[highway.state ?? "paved"];

        this.hwicon.show();
        this.hwicon.css('--color', `hsl(${state.color[0]}deg, ${state.color[1]}%, ${state.color[2]}%)`);
        this.icon.hide();
        this.setTitle('HIGHWAY');
        this.setSubtitle(highway.name);
        this.setFromTo(highway.from, highway.to);
        this.setState(state);
        this.elem.show();
    }

    setBlockage(blockage) {
        this.clearAll();

        this.hwicon.hide();
        this.icon.css('background-color', '#bd0202');
        this.icon.show();
        this.setTitle('BLOCKAGE');
        this.setCoord(blockage.coords.join(', '));
        this.setSubtitle(blockage.title);
        this.setUser(blockage.user ?? 'Unknown');
        this.setDescription(blockage.desc ?? 'No description provided');
        this.setDate(formatTime(blockage.submitTime));
        this.elem.show();
    }

    setMonument(monument) {
        this.clearAll();

        this.hwicon.hide();
        this.icon.css('background-color', '#bd0202');
        this.icon.show();
        this.setTitle('MONUMENT');
        this.setSubtitle(monument.name);
        if (monument.description)
            this.setDescription(monument.description);
        this.setCoord(monument.coords);
        this.setVideo(monument.video);
        this.elem.show();
    }

    close() {
        this.elem.hide();
    }

    onClose(func) {
        this.closeCallback = func;
    }
}

function shortenInt(value) {
    if (Math.abs(value) >= 1_000_000)
        return Math.floor(value / 100_000) / 10 + 'm';
    else if (Math.abs(value) >= 1_000)
        return Math.floor(value / 100) / 10 + 'k';
    else
        return value;
}

function vecAdd(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1]];
}

function vecSub(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1]];
}

function vecMul(v1, v2) {
    return [v1[0] * v2[0], v1[1] * v2[1]];
}

function vecNeg(v) {
    return [-v[0], -v[1]];
}

function normalize(v) {
    let l = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return [
        v[0] / l,
        v[1] / l
    ];
}

class Map {
    constructor(canvas, info) {
        this.canvas = canvas;
        this.info = info;
    }

    renderHighway(highway, bottom, hover = false) {
        this.ctx.beginPath();

        let from = this.cam.toScreen(...highway.from);
        let to   = this.cam.toScreen(...highway.to);

        if (bottom) {
            let diff = normalize(vecSub(to, from));
            to   = vecAdd(to, diff, [2, 2]);
            from = vecAdd(from, vecNeg(diff), [2, 2]);
        }

        this.ctx.moveTo(...from);
        this.ctx.lineTo(...to);

        let state = STATES[highway.state ?? "paved"];

        if (bottom) {
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = HIGHWAY_WIDTH;
            this.ctx.stroke();
        } else {
            this.ctx.strokeStyle = `hsl(${state.color[0]}deg, ${state.color[1]}%, ${state.color[2] + (hover ? 20 : 0)}%)`;
            this.ctx.lineWidth = HIGHWAY_WIDTH - 2;
            this.ctx.stroke();
        }
        
        this.ctx.closePath();
    }

    renderSpawnImage(img, scale) {
        let [x, y] = this.cam.toScreen(
            -img.width  * scale / 2,
            -img.height * scale / 2
        );

        let w = this.cam.scale(img.width  * scale)
        let h = this.cam.scale(img.height * scale);

        this.ctx.drawImage(img, x, y, w, h);
    }

    renderHighways(highways) {
        for (let i = 0; i < highways.length; i++)
            if (i != this.hoveredHighway && i != this.selectedHighway)
                this.renderHighway(highways[i], true);

        for (let i = 0; i < highways.length; i++)
            if (i != this.hoveredHighway && i != this.selectedHighway)
                this.renderHighway(highways[i], false);

        if (this.hoveredHighway != null) {
            this.renderHighway(highways[this.hoveredHighway], true, true);
            this.renderHighway(highways[this.hoveredHighway], false, true);
        }

        if (this.selectedHighway != null) {
            this.renderHighway(highways[this.selectedHighway], true, true);
            this.renderHighway(highways[this.selectedHighway], false, true);
        }
    }

    renderMarker(x, y, color, selected = false) {
        this.ctx.translate(...this.cam.toScreen(x, y));
        this.ctx.rotate(Math.PI / 4);

        const SIZE = selected ? 15 : 10;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);

        this.ctx.resetTransform();
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    createGrid(cam) {
        let size = 1_000_000;

        for (; this.cam.scale(size) > GRID_SIZE_THRESHOLD; size /= 10);

        return {
            left:   Math.floor(cam.left   / size) + +(cam.left   > 0),
            right:  Math.floor(cam.right  / size) - +(cam.right  < 0),
            top:    Math.floor(cam.top    / size) + +(cam.top    > 0),
            bottom: Math.floor(cam.bottom / size) - +(cam.bottom < 0),
            size
        }
    }

    renderIndicators(grid, cam) {
        this.ctx.fillStyle = "#000";
        this.ctx.font = "bold 14px 'Manrope', sans-serif";

        for (let i = grid.bottom; i <= grid.top; i++) {
            let pos = this.cam.toScreen(cam.left, i * grid.size);

            pos[0] += 5;
            pos[1] -= 5;

            this.ctx.fillText(shortenInt(i * grid.size), ...pos);
        }

        for (let i = grid.left; i <= grid.right; i++) {
            let pos = this.cam.toScreen(i * grid.size, cam.top);

            pos[0] += 5;
            pos[1] += 15;

            this.ctx.fillText(shortenInt(i * grid.size), ...pos);
        }
    }

    renderGrid(grid, cam) {
        this.ctx.lineWidth = 1;

        for (let i = grid.left; i <= grid.right; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(...this.cam.toScreen(i * grid.size, cam.top));
            this.ctx.lineTo(...this.cam.toScreen(i * grid.size, cam.bottom));
            this.ctx.strokeStyle = "#000";
            this.ctx.stroke();
            this.ctx.closePath();
        }

        for (let i = grid.bottom; i <= grid.top; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(...this.cam.toScreen(cam.left, i * grid.size));
            this.ctx.lineTo(...this.cam.toScreen(cam.right, i * grid.size));
            this.ctx.strokeStyle = "#000";
            this.ctx.stroke();
            this.ctx.closePath();
        }
    }

    render() {
        this.ctx.resetTransform();
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.cam.setSize(this.canvas.width, this.canvas.height);

        //this.ctx.fillStyle = "#573333";
        //this.ctx.fillRect(...this.cam.toScreen(-30_00_000, 30_00_000), this.cam.scale(60_00_000), this.cam.scale(60_00_000));
        this.ctx.fillStyle = "#562A2A";
        this.ctx.fillRect(...this.cam.toScreen(-3_750_000, -3_750_000), this.cam.scale(7_500_000), this.cam.scale(7_500_000));

        if (this.spawnImage)
            this.renderSpawnImage(this.spawnImage, 4.095);

        let camRect = this.cam.getRect();
        let grid = this.createGrid(camRect);

        this.renderGrid(grid, camRect);

        this.renderHighways(this.highways);

        this.renderIndicators(grid, camRect);

        for (let i = 0; i < this.blockages.length; i++)
            this.renderMarker(...this.blockages[i].coords, i == this.selectedBlockage ? '#B07D48' : '#E2C799', i == this.selectedBlockage);

        for (let i = 0; i < this.monuments.length; i++) {
            let selected = i == this.selectedMonument || i == this.hoveredMonument;
            this.renderMarker(...this.monuments[i].coords, selected ? '#B07D48' : '#E2C799', i == this.selectedMonument);
        }

        if (this.marker)
            this.renderMarker(...this.marker, '#0000b0');
    }

    move(x, y) {
        this.cam.x -= x / this.cam.zoom;
        this.cam.y -= y / this.cam.zoom;

        this.render();
    }

    highwayDistSqrd(x, y, highway) {
        let [x1, y1] = this.cam.toScreen(...highway.from);
        let [x2, y2] = this.cam.toScreen(...highway.to);
        
        return pDistanceSqrd(x, y, x1, y1, x2, y2);
    }

    isInHighway(x, y, highway) {
        let [x1, y1] = this.cam.toScreen(...highway.from);
        let [x2, y2] = this.cam.toScreen(...highway.to);
        
        return pDistanceSqrd(x, y, x1, y1, x2, y2) < LINE_HOVER_THRESHOLD * LINE_HOVER_THRESHOLD;
    }

    hover(x, y) {
        let [mx, my] = this.cam.toWorld(x, y);

        $('#coords').text(`XZ: ${mx}, ${my}`);
        $('#ow-coords').text(`(Overworld XZ: ${mx * 8}, ${my * 8})`);

        let prevHovered = this.hoveredHighway;

        this.hoveredHighway  = null;
        this.hoveredMonument = null;

        for (let i = 0; i < this.monuments.length; i++) {
            if (this.isInMarker(x, y, this.monuments[i])) {
                this.hoveredMonument = i;
                this.render();
                return;
            }
        }

        let lastDist = LINE_HOVER_THRESHOLD * LINE_HOVER_THRESHOLD;

        for (let i = 0; i < this.highways.length; i++) {
            let dist = this.highwayDistSqrd(x, y, this.highways[i]);
            if (dist < lastDist) {
                this.hoveredHighway = i;
                lastDist = dist;
            }
        }

        if (this.hoveredHighway != prevHovered) {
            this.render();
        }
    }

    isInMarker(x, y, marker) {
        let [mx, my] = this.cam.toScreen(...marker.coords);
        
        let v = Math.abs(mx - x) + Math.abs(my - y);
        return v <= 8;
    }

    click(x, y) {
        this.selectedHighway = null;
        this.marker = null;
        this.selectedBlockage = null;
        this.selectedMonument = null;

        if (this.hoveredHighway != null) {
            this.selectedHighway = this.hoveredHighway;

            this.info.setHighway(this.highways[this.selectedHighway]);
        } else if (this.hoveredMonument != null) {
            this.selectedMonument = this.hoveredMonument;

            this.info.setMonument(this.monuments[this.selectedMonument]);
        } else {
            for (let i = 0; i < this.blockages.length; i++) {
                if (this.isInMarker(x, y, this.blockages[i])) {
                    this.marker = null;
                    this.selectedBlockage = i;
                    this.info.setBlockage(this.blockages[i]);
                    this.render();
                    return;
                }
            }

            /*this.marker = this.cam.toWorld(x, y);
            this.selectedBlockage = null;
            this.selectedHighway  = null;

            this.info.setMarker(...this.marker);*/

            this.info.close();
        }

        this.render();
    }

    zoom(z, x, y, multiply = false) {
        let zoomA = this.cam.zoom;
        let zoomB = zoomA * (multiply ? z : Math.pow(2, -z / 100 * ZOOM_SENSIVITY));
        zoomB = Math.min(0.4, Math.max(zoomB, 0.00002))

        let width  = this.cam.width;
        let height = this.cam.height;
        let camX   = this.cam.x;
        let camY   = this.cam.y;

        let diff = 1 / zoomA - 1 / zoomB;

        let offX = width  * diff;
        let offY = height * diff;

        offX = -offX / 2 + (x / width)  * offX;
        offY = -offY / 2 + (y / height) * offY;

        this.cam.x = camX + offX;
        this.cam.y = camY + offY;
        this.cam.zoom = zoomB;

        this.render();
    }

    async init() {
        this.ctx = this.canvas.getContext('2d');
        this.cam = new Camera();

        let spawn = new Image();

        spawn.style.imageRendering = "pixelated";

        spawn.onload = e => {
            console.log(spawn);
            this.spawnImage = spawn;
            this.render();
        }

        spawn.src = "nether_spawn.png";

        this.marker = null;
        this.selectedBlockage = null;

        this.hoveredMonument  = null;
        this.selectedMonument = null;
        
        this.hoveredHighway = null;
        this.selectedHighway = null;

        this.blockages = [];//await serverApi.getBlockages();

        this.monuments = await serverApi.getMonuments();

        this.highways = await serverApi.getHighways();

        this.info.onClose(() => {
            this.marker = null;
            
            this.selectedBlockage = null;
            this.selectedHighway = null;
            this.selectedMonument = null;

            this.render();
        });

        this.render();
    }
}

let mouseHold = false;
let mouseDrag = false;
let mouseHoldMove = 0;

function clearSelections() {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    } else if (document.selection) {  // IE?
        document.selection.empty();
    }
}

window.addEventListener('load', async () => {
    let viewport = document.getElementById('viewport');
    let canvas = document.getElementById('canvas');

    canvas.width  = viewport.clientWidth * window.devicePixelRatio;
    canvas.height = viewport.clientHeight * window.devicePixelRatio;
    canvas.style.width  = viewport.clientWidth + 'px';
    canvas.style.height = viewport.clientHeight + 'px';

    let info = new MapInfo($('#info'));

    let map = new Map(canvas, info);

    await map.init();

    canvas.onmousedown = e => {
        if (e.button == 0) {
            mouseHold = true;
            mouseHoldMove = 0;
        }
    }

    let multitouch = false;

    canvas.onmouseup = e => {
        if (e.button == 0 && !mouseDrag && !multitouch)
            map.click(e.offsetX, e.offsetY);

        mouseHold = false;
        mouseDrag = false;
        multitouch = false;

        canvas.style.cursor = '';
    }

    canvas.onmousemove = e => {
        if (mouseDrag) {
            map.move(e.movementX, e.movementY);
        } else if (mouseHold) {
            mouseHoldMove += Math.abs(e.movementX) + Math.abs(e.movementY);
            if (mouseHoldMove > 6) {
                mouseDrag = true;
                canvas.style.cursor = 'grabbing';
            }
        } else
            map.hover(e.offsetX, e.offsetY);
    }

    document.onmousemove = () => {
        if (mouseDrag || mouseHold)
            clearSelections();
    }

    canvas.onwheel = e => {
        map.zoom(e.deltaY, e.offsetX, e.offsetY);
    }

    let lastTouches = [];

    function getRelPos(touch) {
        let rect = canvas.getBoundingClientRect();

        return {x: touch.clientX - rect.x, y: touch.clientY - rect.y};
    }

    let lastTouchLength = null;

    canvas.ontouchmove = e => {
        let touches = [];
        for (let t of e.touches)
            touches.push(getRelPos(t));
        
        if (lastTouches.length == 1 && touches.length == 1) {
            let movX = touches[0].x - lastTouches[0].x;
            let movY = touches[0].y - lastTouches[0].y;

            map.move(movX, movY);
        } else if (lastTouches.length == 2 && touches.length == 2) {
            multitouch = true;

            let centerX = (touches[0].x + touches[1].x) / 2;
            let centerY = (touches[0].y + touches[1].y) / 2;
            
            let lastCenterX = (lastTouches[0].x + lastTouches[1].x) / 2;
            let lastCenterY = (lastTouches[0].y + lastTouches[1].y) / 2;

            map.move(centerX - lastCenterX, centerY - lastCenterY);

            let len = Math.sqrt(Math.pow(touches[0].x - touches[1].x, 2) + Math.pow(touches[0].y - touches[1].y, 2));
            
             if (lastTouchLength != null)
                map.zoom(len / lastTouchLength, centerX, centerY, true);

            lastTouchLength = len;
        }

        if (touches.length != 2)
            lastTouchLength = null;

        lastTouches = touches;
    }

    canvas.ontouchend = e => {
        lastTouches = [];
        lastTouchLength = null;
    }

    window.onresize = () => {
        canvas.width  = viewport.clientWidth * window.devicePixelRatio;
        canvas.height = viewport.clientHeight * window.devicePixelRatio;
        canvas.style.width  = viewport.clientWidth + 'px';
        canvas.style.height = viewport.clientHeight + 'px';

        map.render();
    }
});
