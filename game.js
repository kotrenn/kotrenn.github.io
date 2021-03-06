// src/js/vec2f.js
var EPSILON = 0.0001;

class vec2f
{
	zero()
	{
		return new vec2f(0, 0);
	}
	
	constructor(x, y)
	{
		this.x = x;
		this.y = y;
	}

	add(rhs)
	{
		return new vec2f(this.x + rhs.x, this.y + rhs.y);
	}

	sub(rhs)
	{
		return new vec2f(this.x - rhs.x, this.y - rhs.y);
	}

	dot(rhs)
	{
		return this.x * rhs.x + this.y * rhs.y;
	}

	scale(rhs)
	{
		return new vec2f(this.x * rhs, this.y * rhs);
	}

	norm()
	{
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	unit()
	{
		var mag = this.norm();
		if (mag < EPSILON) return vec2f.zero();
		return new vec2f(this.x / mag, this.y / mag);
	}

	normalize()
	{
		var mag = this.norm();
		if (mag < EPSILON)
			this.x = this.y = 0.0;
		this.x /= mag;
		this.y /= mag;
	}
}



// src/js/sticker.js
var MOVE_DURATION = 1200; // 1.2 seconds
var STICKER_RADIUS = 4.20;

class Sticker
{
	constructor(color, shape)
	{
		this.color = color;
		this.slot = null;
		this.prevArc = null;
		this.prevInverted = false;
		this.shape = shape;
	}

	getShape()
	{
		return this.shape;
	}

	getSlot()
	{
		return this.slot;
	}

	moveToSlot(slot, arc, inverted)
	{
		this.prevTime = (new Date()).getTime();
		this.prevArc = arc;
		this.prevInverted = inverted;
		this.slot = slot;
	}

	setColor(color)
	{
		this.color = color;
	}

	getTimeRatio()
	{
		var currentTime = (new Date()).getTime();
		var ret = (currentTime - this.prevTime) / MOVE_DURATION;
		if (ret > 1.0) ret = 1.0;
		return ret;
	}

	getCenter()
	{
		var slotCenter = this.slot.getCenter();
		var ret = slotCenter;
		if (this.prevArc != null)
		{
			var t = this.getTimeRatio();
			if (t < 1.0)
			{
				if (this.prevInverted) t = 1.0 - t;
				ret = this.prevArc.getPoint(t);
			}
		}
		return ret;
	}

	move(timeDelta)
	{
	}

	cloneSlot()
	{
		this.color = this.slot.getColor();
		this.shape = this.slot.getShape();
	}
	
	draw(context)
	{
		var center = this.getCenter();
		//fillCircle(context, this.color, center.x, center.y, STICKER_RADIUS);
		if (g_displayMode == 0)
		{
			fillCircle(context, this.color, center.x, center.y, STICKER_RADIUS);
		}
		else if (g_displayMode == 1)
		{
			fillCircle(context, this.color, center.x, center.y, STICKER_RADIUS);
		}
		else if (g_displayMode == 2)
		{
			var r = STICKER_RADIUS / GRAPHICS_SCALE * RADIUS_SCALE * 1.1;
			var x0 = center.x - r;
			var y0 = center.y - r;
			var x1 = center.x + r;
			var y1 = center.y + r;
			drawLine(context, this.color, x0, center.y, center.x, y0);
			drawLine(context, this.color, x0, center.y, center.x, y1);
			drawLine(context, this.color, x1, center.y, center.x, y0);
			drawLine(context, this.color, x1, center.y, center.x, y1);
		}
		else if (g_displayMode == 3)
		{
			fillShape(context, this.shape, this.color, center.x, center.y, STICKER_RADIUS * 1.1);
		}
	}
}



// src/js/arc.js
var ARC_LINE = 0;
var ARC_CIRCLE = 1;

function NewLineArc(permutation, slotU, slotV)
{
	return new Arc(permutation, slotU, slotV, ARC_LINE);
}

function NewCircleArc(permutation,
					  slotU,
					  slotV,
					  circleRadius,
					  circlePlus,
					  circleReversed,
					  circleReflected)
{
	var ret = new Arc(permutation, slotU, slotV, ARC_CIRCLE);
	
	ret.circleRadius = circleRadius;
	ret.circlePlus = circlePlus;
	ret.circleReversed = circleReversed;
	ret.circleReflected = circleReflected;

	ret.computeParameters();

	return ret;
}

class Arc
{
	constructor(permutation, slotU, slotV, shape)
	{
		this.permutation = permutation;
		this.slotU = slotU;
		this.slotV = slotV;
		this.shape = shape;
		this.startTime = 0;
		this.debugEnabled = false;

		// CircleArc vars
		this.circleRadius = 0.0;
		this.circlePlus = false;
		this.circleReversed = false;
		this.circleReflected = false;
		this.circleCenter = new vec2f(0.0, 0.0);
		this.thetaU = 0.0;
		this.thetaV = 0.0;
		this.dTheta = 0.0;
	}

	draw(context)
	{
		var color = this.permutation.getColor();
		
		if (this.shape == ARC_LINE)
		{
			var v0 = this.slotU.getCenter();
			var v1 = this.slotV.getCenter();

			var color = this.permutation.getColor();

			drawLine(context, color, v0.x, v0.y, v1.x, v1.y);
		}
		else if (this.shape == ARC_CIRCLE)
		{
			var numIntervals = 20;
			if (this.debugEnabled) numIntervals = 5;
			var dt = 1.0 / numIntervals;
			
			for (var i = 0; i < numIntervals; i++)
			{
				var t0 = i * dt;
				var t1 = (i + 1) * dt;

				var p0 = this.getPoint(t0);
				var p1 = this.getPoint(t1);

				drawLine(context, color, p0.x, p0.y, p1.x, p1.y);

				if (this.debugEnabled)
				{
					var r = Math.floor(255 * t0).toString(16);
					while (r.length < 2)
						r = '0' + r;
					var g = '00';
					var b = Math.floor(255 * (1.0 - t0)).toString(16);
					while (b.length < 2)
						b = '0' + b;
					var purple = '#' + r + g + b;
					fillCircle(context, purple, p0.x, p0.y, 3);
				}
			}

			if (this.debugEnabled)
			{
				var green = '#00FF00';
				var x = this.circleCenter.x;
				var y = this.circleCenter.y;
				fillCircle(context, green, x, y, 3);
			}
		}
	}

	getPoint(t)
	{
		var ret = new vec2f(0.0, 0.0);
		
		if (this.shape == ARC_LINE)
		{
			var lhs = this.slotU.getCenter().scale(1.0 - t);
			var rhs = this.slotV.getCenter().scale(t);
			ret = lhs.add(rhs);
		}
		else if (this.shape == ARC_CIRCLE)
		{
			var theta = this.thetaU + t * this.dTheta;

			var p = new vec2f(Math.cos(theta), Math.sin(theta));
			p = p.scale(this.circleRadius);
			p = p.add(this.circleCenter);

			return p;
		}

		return ret;
	}

	computeParameters()
	{
		if (this.shape == ARC_CIRCLE)
		{
			var v0 = this.slotU.getCenter();
			var v1 = this.slotV.getCenter();

			// Calculate the center of the circle;
			var d = v0.sub(v1).norm();
			var r2 = this.circleRadius * this.circleRadius;
			var disc = r2 - d * d / 4.0;
			var minDisc = EPSILON;
			if (disc < minDisc) disc = minDisc;
			var h = Math.sqrt(disc);
			var midpoint = v0.add(v1).scale(0.5);
			var disp = v1.sub(v0).unit();
			var rot = new vec2f(disp.y, -disp.x);
			if (this.circlePlus) rot = rot.scale(-1.0);
			this.circleCenter = midpoint.add(rot.scale(h));

			// Set up interval of angles to iterate along
			var deltaU = v0.sub(this.circleCenter);
			var deltaV = v1.sub(this.circleCenter);

			this.thetaU = Math.atan2(deltaU.y, deltaU.x);
			this.thetaV = Math.atan2(deltaV.y, deltaV.x);

			this.dTheta = this.thetaV - this.thetaU;

			// Invert it?
			if (this.circleReversed)
			{
				this.thetaU += 2.0 * Math.PI;
				this.dTheta = this.thetaV - this.thetaU;
			}
			if (this.circleReflected)
			{
				this.thetaU -= 2.0 * Math.PI;
				this.dTheta = this.thetaV - this.thetaU;
			}

			if (this.debugEnabled)
			{
				var numIntervals = 10;
				console.log('begin dump');
				for (var i = 0; i <= numIntervals; i++)
				{
					var t = i * (1.0 / numIntervals);
					var theta = this.thetaU + t * this.dTheta;
					console.log(theta);
				}
				console.log('');
			}
		}
	}

	adjustCenter(vec)
	{
	}

	normalize(radius)
	{
		if (this.shape == ARC_CIRCLE)
		{
			this.circleRadius /= radius;
		}
	}
}



// src/js/button.js
class Button
{
	constructor(permutation, depth, pos)
	{
		this.permutation = permutation;
		this.depth       = depth;
		this.pos         = pos;
		this.buttonSkip  = 10;
		this.buttonW     = 25;
		this.buttonH     = this.buttonW;
		this.buttonX     = g_gameCanvas.width;
		this.buttonX    -= this.pos * (this.buttonW + this.buttonSkip);
		this.buttonY     = this.buttonSkip;
		this.buttonY    += this.depth * (this.buttonH + this.buttonSkip);
		
		var visibleIndex = (this.permutation.getIndex() + 1) % 10;
		this.numStr      = visibleIndex.toString();
		this.numX        = this.buttonX + 0.5 * this.buttonW - 0.25 * FONT_SIZE;
		this.numY        = this.buttonY +       this.buttonH + 1.15 * FONT_SIZE;
	}

	getPermutation()
	{
		return this.permutation;
	}

	drawUI(context)
	{
		// Draw button
		fillRectUI(context,
				   this.permutation.getColor(),
				   this.buttonX,
				   this.buttonY,
				   this.buttonW,
				   this.buttonH);
	}

	getMinX()
	{
		return this.buttonX;
	}

	getMinY()
	{
		return this.buttonY;
	}

	getMaxX()
	{
		return this.buttonX + this.buttonW;
	}

	getMaxY()
	{
		return this.buttonY + this.buttonH;
	}
}



// src/js/slot.js
var SLOT_RADIUS = 7.40;

class Slot
{
	constructor(name, sticker, center, color)
	{
		this.name = name;
		this.sticker = sticker;
		this.center = center;
		this.delta = (0, 0);
		this.color = color;
		this.scale = 0.3;
		this.shape = sticker.getShape();
	}

	draw(context)
	{
		if (g_displayMode == 0)
		{
			fillCircle(context, this.color, this.center.x, this.center.y, SLOT_RADIUS);
		}
		else if (g_displayMode == 1)
		{
			drawCircle(context, this.color, this.center.x, this.center.y, SLOT_RADIUS);
		}
		else if (g_displayMode == 2)
		{
			var r = SLOT_RADIUS / GRAPHICS_SCALE * RADIUS_SCALE * 1.1;
			var x0 = this.center.x - r;
			var y0 = this.center.y - r;
			var x1 = this.center.x + r;
			var y1 = this.center.y + r;
			drawLine(context, this.color, x0, this.center.y, this.center.x, y0);
			drawLine(context, this.color, x0, this.center.y, this.center.x, y1);
			drawLine(context, this.color, x1, this.center.y, this.center.x, y0);
			drawLine(context, this.color, x1, this.center.y, this.center.x, y1);
		}
		else if (g_displayMode == 3)
		{
			drawShape(context, this.shape, this.color, this.center.x, this.center.y, SLOT_RADIUS * 1.1);
		}
	}

	setSticker(sticker)
	{
		this.sticker = sticker;
	}

	getColor()
	{
		return this.color;
	}

	getShape()
	{
		return this.shape;
	}

	getCenter()
	{
		return this.center;
	}

	setCenter(center)
	{
		this.center = center;
	}
}



// src/js/game.js
var g_shiftPressed = false;
var g_showHelp = false;

var g_actionPanel = null;
var g_puzzleData = null;
var g_puzzleIndex = 0;

var g_displayMode = 3;

function testAAA()
{
    var builder = new PuzzleBuilder('puzzles/AAA');

    builder.addNode('lhs', '#ff0000', 1, 1);
    builder.addNode('rhs', '#0000ff', 4, 1);
    builder.addPermutation('#ff0000', [[0, 1]]);
	builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false);
	builder.addCircleArc('#ff0000', 'rhs', 2.2, true, false);
	
	builder.recenter();
	builder.normalize();

    return builder.getPuzzleData();
}

function loadEasier()
{
	var easierList = g_puzzleData.getEasierList();
	var easierStr = 'Easier:';
	for (var i = 0; i < easierList.length; i++)
	{
		var easierPuzzle = easierList[i];
		easierStr += ' <a href="index.html?puzzle=' + easierPuzzle + '">';
		easierStr += easierPuzzle + '</a>';
	}
	document.getElementById("easier").innerHTML = easierStr;
}

function loadHarder()
{
	var harderList = g_puzzleData.getHarderList();
	var harderStr = 'Harder:';
	for (var i = 0; i < harderList.length; i++)
	{
		var harderPuzzle = harderList[i];
		harderStr += ' <a href="index.html?puzzle=' + harderPuzzle + '">';
		harderStr += harderPuzzle + '</a>';
	}
	document.getElementById("harder").innerHTML = harderStr;
}

function loadLocalMap()
{
	var localMapList = g_puzzleData.getLocalMap();
	var mapStr = '<center>';
	for (var i = 0; i < localMapList.length; i++)
	{
		var localMap = localMapList[i];
		mapStr += localMap;
	}
	mapStr += '</center>';
	document.getElementById("localMap").innerHTML = mapStr;
}

function refreshPuzzle()
{
	if (g_puzzleIndex <                    0) g_puzzleIndex = 0;
	if (g_puzzleIndex >= g_puzzleList.length) g_puzzleIndex = g_puzzleList.length - 1;
	
	g_puzzleData = g_puzzleList[g_puzzleIndex];
	g_actionPanel.setPuzzleData(g_puzzleData);
	loadEasier();
	loadHarder();
	loadLocalMap();
}

function previousPuzzle()
{
	--g_puzzleIndex;
	refreshPuzzle();
}

function nextPuzzle()
{
	++g_puzzleIndex;
	refreshPuzzle();
}

function randomPuzzle()
{
	g_puzzleIndex = randInt(1, g_puzzleList.length) - 1;
	refreshPuzzle();
}

function keyDown(e)
{
	if (e.keyCode == 16) // SHIFT
		g_shiftPressed = true;
}

function keyUp(e)
{
	var inverted = g_shiftPressed == true;
	if (e.keyCode == 16) // SHIFT
		g_shiftPressed = false;
	if (49 <= e.keyCode && e.keyCode <= 57) // 1, 2, 3, 4, 5, 6, 7, 8, 9
		g_puzzleData.activatePermutation(e.keyCode - 49, inverted);
	if (e.keyCode == 48) // 0
		g_puzzleData.activatePermutation(10, inverted);
	if (e.keyCode == 90) // Z
		previousPuzzle();
	if (e.keyCode == 88) // X
		nextPuzzle();
	if (e.keyCode == 72) // H
		g_showHelp = g_showHelp == false;
	if (e.keyCode == 82) // R
		g_puzzleData.randomize();
	if (e.keyCode == 83) // S
		g_puzzleData.solve();
	if (e.keyCode == 74) // J
		g_actionPanel.prevAction();
	if (e.keyCode == 76) // L
		g_actionPanel.nextAction();
	if (e.keyCode == 73) // I
		g_actionPanel.activateAction(false);
	if (e.keyCode == 75) // K
		g_actionPanel.activateAction(true);
	if (e.keyCode == 66) // B
		g_displayMode = 0;
	if (e.keyCode == 78) // N
		g_displayMode = 1;
	if (e.keyCode == 77) // M
		g_displayMode = 2;
	if (e.keyCode == 86) // V
		g_displayMode = 3;
	if (e.keyCode == 80) // P
		randomPuzzle();
}

function update()
{
}

function draw()
{
	g_gameContext.clearRect(0, 0, g_gameCanvas.width, g_gameCanvas.height);

	g_puzzleData.draw(g_gameContext);
	g_actionPanel.drawUI(g_gameContext);

	var controls = [
					'1, 2, 3, 4, 5 - Activate Permutation',
					'6, 7, 8, 9, 0',
					' [Hold] Shift - Reverse Permutation',
		            '            Z - Previous Puzzle',
					'            X - Next Puzzle',
					'            R - Randomize Puzzle',
					'            S - Solve Puzzle',
					'            J - Previous Action',
					'            L - Next Action',
                    '            I - Activate Action',
                    '            K - Activate Action (R)',
             		'            P - Random Puzzle'
	               ];
	var helpMsg  = 'H - Show Help';
	var startY = g_gameCanvas.height - 20 * controls.length - 10;
	if (g_showHelp)
		for (var i = 0; i < controls.length; i++)
			drawString(g_gameContext, '#000000', controls[i], 5, startY + 20 * i);
	drawString(g_gameContext, '#000000', helpMsg, 5, startY + 20 * controls.length);
}

function loop()
{
	update();
	draw();
}

function main()
{
	g_actionPanel = new ActionPanel();
	getPuzzleFromQuery();
	refreshPuzzle();
	
	document.addEventListener("keydown", keyDown, false);
	document.addEventListener("keyup", keyUp, false);

	setInterval(loop, 10);
}



// src/js/action.js
class Action
{
	constructor()
	{
		this.buttonList = [];
	}

	addPermutation(permutation, depth, pos)
	{
		if (this.buttonList.length == 0)
		{
			var n                   = permutation.getSize();
			var color               = permutation.getColor();
			var identityPermutation = new Permutation(n, color, -1);
			var identityButton      = new Button(identityPermutation, 0, pos);
			this.buttonList.push(identityButton);
		}
		
		var button = new Button(permutation, depth, pos);
		this.buttonList.push(button);
	}

	apply(puzzleData, inverted)
	{
		for (var i = 1; i < this.buttonList.length; i++)
		{
			var button = this.buttonList[i];
			var permutation = button.getPermutation();
			permutation.apply(puzzleData, inverted);
		}
	}

	startIndex()
	{
		var ret = 0;
		if (this.buttonList.length == 2)
			ret = 1;

		return ret;
	}

	drawUI(context)
	{
		for (var i = this.startIndex(); i < this.buttonList.length; i++)
			this.buttonList[i].drawUI(context);

		// Draw number
		if (this.buttonList.length == 2)
			drawString(context,
				      '#000000',
				      this.buttonList[1].numStr,
				      this.buttonList[1].numX,
				      this.buttonList[1].numY);
	}

	getMinX()
	{
		var ret = g_gameCanvas.width;
		
		for (var i = this.startIndex(); i < this.buttonList.length; i++)
		{
			var button = this.buttonList[i];
			if (button == null) continue;
			var buttonMinX = button.getMinX();
			if (buttonMinX < ret) ret = buttonMinX;
		}

		return ret;
	}
	
	getMinY()
	{
		var ret = g_gameCanvas.height;
		
		for (var i = this.startIndex(); i < this.buttonList.length; i++)
		{
			var button = this.buttonList[i];
			if (button == null) continue;
			var buttonMinY = button.getMinY();
			if (buttonMinY < ret) ret = buttonMinY;
		}

		return ret;
	}
	
	getMaxX()
	{
		var ret = -1;
		
		for (var i = this.startIndex(); i < this.buttonList.length; i++)
		{
			var button = this.buttonList[i];
			if (button == null) continue;
			var buttonMaxX = button.getMaxX();
			if (buttonMaxX > ret) ret = buttonMaxX;
		}

		return ret;
	}
	
	getMaxY()
	{
		var ret =-1;
		
		for (var i = this.startIndex(); i < this.buttonList.length; i++)
		{
			var button = this.buttonList[i];
			if (button == null) continue;
			var buttonMaxY = button.getMaxY();
			if (buttonMaxY > ret) ret = buttonMaxY;
		}

		return ret;
	}
}



// src/js/query.js
// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript

function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getPuzzleFromQuery()
{
	var puzzleName = getParameterByName('puzzle');
	
	if (puzzleName == null)
		return;

	if (puzzleName.length == 0)
		return;

	g_puzzleIndex = 0;
	for (var i = 0; i < g_puzzleList.length; i++)
	{
		var puzzle = g_puzzleList[i];
		if (puzzle.name == puzzleName)
		{
			g_puzzleIndex = i;
			return;
		}
	}
}



// src/js/permutation.js
class Permutation
{
	constructor(n, color, index)
	{
		this.mapping = linearArray(n);
		this.labels = linearStrArray(n);
		this.color = color;
		this.index = index;
		this.reverseIndex = -1;
	}

	draw(context, arcList)
	{
		// Draw arcs
		for (var i = 0; i < arcList.length; i++)
		{
			var arc = arcList[i];
			if (arc == null) continue;
			arc.draw(context);
		}
	}

	getSize()
	{
		return this.mapping.length;
	}

	getColor()
	{
		return this.color;
	}

	getMapping()
	{
		return this.mapping;
	}

	getIndex()
	{
		return this.index;
	}

	getReverseIndex()
	{
		return this.reverseIndex;
	}

	setReverseIndex(reverseIndex)
	{
		this.reverseIndex = reverseIndex;
	}

	setCycles(cycles)
	{
		for (var k = 0; k < cycles.length; k++)
		{
			var cycle = cycles[k];
			for (var i = 0; i < cycle.length; i++)
			{
				var j = (i + 1) % cycle.length;
				this.mapping[cycle[i]] = cycle[j];
			}
		}
	}

	multiply(rhs)
	{
		var ret = new Permutation(this.mapping.length, this.color, this.index);
		for (var i = 0; i < this.mapping.length; i++)
			ret.mapping[i] = this.mapping[rhs.mapping[i]];
		
		return ret;
	}

	apply(puzzleData, inverted)
	{
		// Arcs for this permutation
		var arcList = puzzleData.getArcList(this);

		// Previous lists
		var stickerList = puzzleData.getStickerList();
		var slotList = puzzleData.getSlotList();

		// Buffer list to construct the new list without modifying the old list
		var newStickerList = [];
		for (var i = 0; i < stickerList.length; i++)
			newStickerList.push(stickerList[i]);

		// Reorder newStickerList as necessary
		for (var i = 0; i < this.mapping.length; i++)
		{
			var j = this.mapping[i];

			// Swap indices around if inverting
			var a = i;
			var b = j;
			if (inverted) { a = j; b = i; }
			var start = a;
			if (inverted) start = b;

			// Perform the copy
			var sticker = stickerList[a];
			newStickerList[b] = sticker;
			sticker.moveToSlot(slotList[b], arcList[start], inverted);
		}

		// Copy results into puzzleData
		puzzleData.setStickerList(newStickerList);
	}

	next(index, inverted=false)
	{
		var ret = this.mapping[index];

		if (inverted)
			for (var i = 0; i < this.mapping.length; i++)
				if (this.mappign[i] == index)
					ret = i;
		
		return ret;
	}

	clone()
	{
		var ret = new Permutation(this.mapping.length, this.color, this.index);

		for (var i = 0; i < this.mapping.length; i++)
		{
			ret.mapping[i] = this.mapping[i];
			ret.labels[i] = this.labels[i];
		}
		
		return ret;
	}
}



// src/js/puzzlebuilder.js
class PuzzleBuilder
{
	constructor(name)
	{
		this.name = name;
		this.puzzleData = new PuzzleData(name);
		this.nodeList = [];
		this.permutationMap = {};
	}

	getPuzzleData()
	{
		this.reverseIndexList();
		return this.puzzleData;
	}

	reverseIndexList()
	{
		for (var i = 0; i < this.puzzleData.getPermutationListSize(); i++)
		{
			var j = this.puzzleData.getPermutationListSize() - i - 1;
			this.puzzleData.getPermutation(i).setReverseIndex(j);
		}
	}

	indexOf(nodeName)
	{
		for (var i = 0; i < this.puzzleData.getSlotListSize(); i++)
			if (this.puzzleData.getSlot(i).name == nodeName)
				return i;
		
		return -1;
	}

	addNode(nodeName, nodeColor, nodeShape, nodeX, nodeY)
	{
		var newSticker = new Sticker(nodeColor, nodeShape % NUM_SHAPES);
		var newSlot = new Slot(nodeName, newSticker, new vec2f(nodeX, nodeY), nodeColor);
		newSticker.moveToSlot(newSlot);
		this.puzzleData.addSlot(newSlot);
		this.puzzleData.addSticker(newSticker);
		this.nodeList.push(nodeName);
	}

	addPermutation(color, cycleList)
	{
		var n = this.puzzleData.slotList.length;
		var index = this.puzzleData.getPermutationListSize();
		var newPermutation = new Permutation(n, color, index);
		newPermutation.setCycles(cycleList);
		this.puzzleData.addPermutation(newPermutation);
		this.permutationMap[color] = newPermutation;
	}

	addCircleArc(arcColor, nodeName, circleR,
				 circlePlus, circleInverted, circleReversed, circleReflected)
	{
		var permutation = this.permutationMap[arcColor];
		var indexU = this.indexOf(nodeName);
		var indexV = permutation.next(indexU);
		var slotU = this.puzzleData.getSlot(indexU);
		var slotV = this.puzzleData.getSlot(indexV);
		var circleArc = NewCircleArc(permutation, slotU, slotV,
									 circleR, circlePlus, circleInverted,
									 circleReversed, circleReflected);
		this.puzzleData.setArc(permutation, indexU, circleArc);
	}
	
	recenter()
	{
		var centerSum = new vec2f(0.0, 0.0);

		for (var i = 0; i < this.puzzleData.getSlotListSize(); i++)
		{
			var slot = this.puzzleData.getSlotList()[i];
			
			var slotCenter = slot.getCenter();
			centerSum = centerSum.add(slotCenter);
		}

		centerSum = centerSum.scale(1.0 / this.puzzleData.getSlotListSize());

		for (var i = 0; i < this.puzzleData.getSlotListSize(); i++)
		{
			var slot = this.puzzleData.getSlotList()[i];

			var slotCenter = slot.getCenter();
			slotCenter = slotCenter.sub(centerSum);
			slot.setCenter(slotCenter);
		}

		for (var i = 0; i < this.puzzleData.getPermutationListSize(); i++)
		{
			var permutation = this.puzzleData.getPermutationList()[i];
			var arcList = this.puzzleData.getArcList(permutation);
			for (var j = 0; j < arcList.length; j++)
			{
				var arc = arcList[j];
				arc.adjustCenter(centerSum);
			}
		}
	}

	normalize()
	{
		var maxRadius = -1.0;

		for (var i = 0; i < this.puzzleData.getSlotListSize(); i++)
		{
			var slot = this.puzzleData.getSlotList()[i];

			var slotCenter = slot.getCenter();
			var radius = slotCenter.norm();
			if (radius > maxRadius)
				maxRadius = radius;
		}

		for (var i = 0; i < this.puzzleData.getSlotListSize(); i++)
		{
			var slot = this.puzzleData.getSlotList()[i];

			var slotCenter = slot.getCenter();
			slotCenter = slotCenter.scale(1.0 / maxRadius);
			slot.setCenter(slotCenter);
		}

		for (var i = 0; i < this.puzzleData.getPermutationListSize(); i++)
		{
			var permutation = this.puzzleData.getPermutationList()[i];
			var arcList = this.puzzleData.getArcList(permutation);
			for (var j = 0; j < arcList.length; j++)
			{
				var arc = arcList[j];
				arc.normalize(maxRadius);
				arc.computeParameters();
			}
		}
	}

	addEasier(puzzleName)
	{
		this.puzzleData.addEasier(puzzleName);
	}

	addHarder(puzzleName)
	{
		this.puzzleData.addHarder(puzzleName);
	}

	addLocalMap(mapStr)
	{
		this.puzzleData.addLocalMap(mapStr);
	}
}



// src/js/puzzledata.js
class PuzzleData
{
	constructor(name)
	{
		this.name = name;
		this.permutationList = [];
		this.slotList = [];
		this.stickerList = [];
		this.arcMap = [];
		this.center = new vec2f(0.0, 0.0);
		this.easierList = [];
		this.harderList = [];
		this.localMap = [];
	}

	solve()
	{
		for (var i = 0; i < this.stickerList.length; i++)
		{
			var sticker = this.stickerList[i];
			sticker.cloneSlot();
		}
	}

	randomize()
	{
		var numPermutations = this.getPermutationListSize();
		for (var i = 0; i < 1000; i++)
		{
			var randomIndex = randInt(1, numPermutations) - 1;
			var randomInverted = randInt(1, 2) == 1;
			this.activatePermutation(randomIndex, randomInverted);
		}
	}

	activatePermutation(index, inverted)
	{
		if (index >= this.permutationList.length) return;

		var permutation = this.permutationList[index];
		permutation.apply(this, inverted);
	}

	draw(context)
	{
		drawString(context, '#000000', this.name, 5, 20);
		
		for (var i = 0; i < this.permutationList.length; i++)
		{
			var permutation = this.permutationList[i];
			permutation.draw(context, this.getArcList(permutation));
		}

		for (var i = 0; i < this.slotList.length; i++)
			this.slotList[i].draw(context);

		for (var i = 0; i < this.stickerList.length; i++)
			this.stickerList[i].draw(context);
	}

	addEasier(puzzleName)
	{
		this.easierList.push(puzzleName);
	}

	addHarder(puzzleName)
	{
		this.harderList.push(puzzleName);
	}

	addLocalMap(mapStr)
	{
		this.localMap.push(mapStr);
	}

	getEasierList()
	{
		return this.easierList;
	}

	getHarderList()
	{
		return this.harderList;
	}

	getLocalMap()
	{
		return this.localMap;
	}
	
	addPermutation(permutation)
	{
		this.permutationList.push(permutation)
		this.arcMap[permutation.index] = [];

		for (var i = 0; i < this.slotList.length; i++)
		{
			var slotU = this.slotList[i];
			var slotV = this.slotList[permutation.next(i)];
			var lineArc = NewLineArc(permutation, slotU, slotV);
			this.setArc(permutation, i, lineArc);
		}
	}

	addSlot(slot)
	{
		this.slotList.push(slot);
	}

	addSticker(sticker)
	{
		this.stickerList.push(sticker);
	}

	clearSlotList()
	{
		this.slotList = [];
	}

	clearStickerList()
	{
		this.stickerList = [];
	}

	getPermutationList()
	{
		return this.permutationList;
	}

	getSlotList()
	{
		return this.slotList;
	}

	getStickerList()
	{
		return this.stickerList;
	}

	getPermutationListSize()
	{
		return this.permutationList.length;
	}

	getSlotListSize()
	{
		return this.slotList.length;
	}

	getStickerListSize()
	{
		return this.stickerList.length;
	}

	setPermutationList(permutationList)
	{
		this.permutationList = permutationList;
	}

	setSlotList(slotList)
	{
		this.slotList = slotList;
	}

	setStickerList(stickerList)
	{
		this.stickerList = stickerList;
	}

	getPermutation(index)
	{
		return this.permutationList[index];
	}

	getSlot(index)
	{
		return this.slotList[index];
	}

	getSticker(index)
	{
		return this.stickerList[index];
	}

	getArc(permutation, nodeIndex, inverted)
	{
		if (permutation.index >= this.arcMap.length)
			return null;
		
		var arcList = this.arcMap[permutation.index];
		var mapping = permutation.getMapping();
		var nextIndex = mapping[nodeIndex];
		if (inverted)
		{
			for (var i = 0; i < mapping.length; i++)
				if (mapping[i] == nodeIndex)
					nextIndex = i;
		}

		return arcList[nextIndex];
	}

	setArc(permutation, nodeIndex, arc)
	{
		if (permutation.index >= this.arcMap.length)
			this.arcMap[permutation.index] = zeroArray(this.getSlotListSize());

		this.arcMap[permutation.index][nodeIndex] = arc;
	}

	getArcList(permutation)
	{
		return this.arcMap[permutation.index];
	}

	getCenter()
	{
		return this.center;
	}

	setCenter(center)
	{
		this.center = center;p
	}
}



// src/js/arrays.js
function zeroArray(n)
{
	var ret = [];
	for (var i = 0; i < n; i++)
		ret.push(0);
	return ret;
}

function linearArray(n)
{
	var ret = [];
	for (var i = 0; i < n; i++)
		ret.push(i);
	return ret;
}

function linearStrArray(n)
{
	var ret = [];
	for (var i = 0; i < n; i++)
		ret.push(i.toString());
	return ret;
}



// src/js/utils.js
// http://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
function randInt(min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}



// src/js/graphics.js
var g_gameCanvas = document.getElementById("gameCanvas");
var windowWidth = window.innerWidth;
var windowHeight = window.innerHeight;
gameCanvas.width = 0.95 * Math.min(windowWidth, windowHeight);
gameCanvas.height = g_gameCanvas.width;

var g_gameContext = g_gameCanvas.getContext("2d");
var FONT_SIZE = 20;
g_gameContext.font = FONT_SIZE.toString() + 'px Courier';

var GRAPHICS_SCALE = 0.45 * Math.min(g_gameCanvas.width, g_gameCanvas.height);
var X_OFFSET = 0.5 * g_gameCanvas.width;
var Y_OFFSET = 0.5 * g_gameCanvas.height;
var RADIUS_SCALE = 2.0;
var LINE_WIDTH = 4.0;

function drawString(context, color, msg, x, y)
{
	context.fillStyle = color;
	context.fillText(msg, x, y);
}

function adjustPosX(t)
{
	return GRAPHICS_SCALE * t + X_OFFSET;
}

function adjustPosY(t)
{
	return GRAPHICS_SCALE * t + Y_OFFSET;
}

function adjustLen(t)
{
	return GRAPHICS_SCALE * t;
}

function fillRect(context, color, x, y, w, h)
{
	fillRectUI(context,
			   color,
			   adjustPosX(x),
			   adjustPosY(y),
			   adjustLen(w),
			   adjustLenY(h));
}

function fillRectUI(context, color, x, y, w, h)
{
	context.beginPath();
	context.rect(x, y, w, h);
	context.fillStyle = color;
	context.fill();
	context.closePath();
}

function drawLine(context, color, x1, y1, x2, y2)
{
	context.beginPath();
	context.moveTo(adjustPosX(x1), adjustPosY(y1));
	context.lineTo(adjustPosX(x2), adjustPosY(y2));
	context.strokeStyle = color;
	context.lineWidth = LINE_WIDTH;
	context.stroke();
	context.moveTo(0, 0);
}

function fillCircle(context, color, x, y, r)
{
	var radius = RADIUS_SCALE * r;
	context.beginPath();
	context.arc(adjustPosX(x), adjustPosY(y), radius, 0, 2.0 * Math.PI);
	context.fillStyle = color;
	context.fill();
	context.closePath();
}

function drawCircle(context, color, x, y, r)
{
	var radius = RADIUS_SCALE * r;
	context.beginPath();
	context.arc(adjustPosX(x), adjustPosY(y), radius, 0, 2.0 * Math.PI);
	context.strokeStyle = color;
	context.lineWidth = LINE_WIDTH
	context.stroke();
	context.closePath();
}

function drawPolygon(context, color, n, x, y, r)
{
	var radius = (RADIUS_SCALE / GRAPHICS_SCALE) * r;
	context.beginPath();
	context.strokeStyle = color;
	context.moveTo(adjustPosX(x + radius), adjustPosY(y));
	for (var i = 1; i <= n; i++)
	{
		var t0 = (2.0 * Math.PI / n) * (i   );
		var t1 = (2.0 * Math.PI / n) * (i + 1)
		var x0 = radius * Math.cos(t0) + x;
		var y0 = radius * Math.sin(t0) + y;
		var x1 = radius * Math.cos(t1) + x;
		var y1 = radius * Math.sin(t1) + y;
		context.lineTo(adjustPosX(x0), adjustPosY(y0));
	}
	context.stroke();
	context.closePath();
}

function fillPolygon(context, color, n, x, y, r)
{
	var radius = (RADIUS_SCALE / GRAPHICS_SCALE) * r;
	context.beginPath();
	context.fillStyle = color;
	context.moveTo(adjustPosX(x + radius), adjustPosY(y));
	for (var i = 1; i <= n; i++)
	{
		var t0 = (2.0 * Math.PI / n) * (i   );
		var t1 = (2.0 * Math.PI / n) * (i + 1)
		var x0 = radius * Math.cos(t0) + x;
		var y0 = radius * Math.sin(t0) + y;
		var x1 = radius * Math.cos(t1) + x;
		var y1 = radius * Math.sin(t1) + y;
		context.lineTo(adjustPosX(x0), adjustPosY(y0));
	}
	context.fill();
	context.closePath();
}

var NUM_SHAPES = 0;
var SHAPE_CIRCLE = NUM_SHAPES++;
var SHAPE_TRIANGLE = NUM_SHAPES++;
var SHAPE_SQUARE = NUM_SHAPES++;
var SHAPE_PENTAGON = NUM_SHAPES++;
var SHAPE_HEXAGON = NUM_SHAPES++;

function drawShape(context, shape, color, x, y, r)
{
	switch (shape)
	{
		case SHAPE_CIRCLE: drawCircle(context, color, x, y, r); break;
		case SHAPE_TRIANGLE: drawPolygon(context, color, 3, x, y, r); break;
		case SHAPE_SQUARE: drawPolygon(context, color, 4, x, y, r); break;
		case SHAPE_PENTAGON: drawPolygon(context, color, 5, x, y, r); break;
		case SHAPE_HEXAGON: drawPolygon(context, color, 6, x, y, r); break;
	}
}

function fillShape(context, shape, color, x, y, r)
{
	switch (shape)
	{
		case SHAPE_CIRCLE: fillCircle(context, color, x, y, r); break;
		case SHAPE_TRIANGLE: fillPolygon(context, color, 3, x, y, r); break;
		case SHAPE_SQUARE: fillPolygon(context, color, 4, x, y, r); break;
		case SHAPE_PENTAGON: fillPolygon(context, color, 5, x, y, r); break;
		case SHAPE_HEXAGON: fillPolygon(context, color, 6, x, y, r); break;
	}
}



// src/js/actionpanel.js
class ActionPanel
{
	constructor()
	{
		this.actionList = [];
		this.puzzleData = null;

		this.panelX = 0;
		this.panelY = 0;
		this.panelW = 0;
		this.panelH = 0;

		this.PANEL_COLOR   = '#aaaaaa';
		this.BORDER_LEFT   = 10;
		this.BORDER_RIGHT  = 10;
		this.BORDER_TOP    = 10;
		this.BORDER_BOTTOM = 2 * this.BORDER_TOP + FONT_SIZE;

		this.selectionIndex = -1;

		this.selectionX = 0;
		this.selectionY = 0;
		this.selectionW = 0;
		this.selectionH = 0;

		this.SELECTION_BORDER = 5;
		this.SELECTION_COLOR  = '#000000';
	}

	setPuzzleData(puzzleData)
	{
		this.puzzleData = puzzleData;
		this.actionList = [];
		this.selectionIndex = -1;
		
		if (this.puzzleData == null) return;
		
		for (var i = 0; i < this.puzzleData.getPermutationListSize(); i++)
		{
			var permutation = this.puzzleData.getPermutation(i);
			var action = new Action();
			var pos = 0;
			var depth = this.puzzleData.getPermutationListSize() - i;
			action.addPermutation(permutation, pos, depth);
			this.actionList.push(action);
		}

		if (this.actionList.length >= 2)
		{
			var comboAction = new Action();
			var perm0 = this.puzzleData.getPermutation(0);
			var perm1 = this.puzzleData.getPermutation(1);
			var pos   = this.puzzleData.getPermutationListSize() + 1;
			comboAction.addPermutation(perm0, 0, pos);
			comboAction.addPermutation(perm1, 1, pos);
			this.actionList.push(comboAction);
		}

		if (this.actionList.length > 0)
			this.selectionIndex = 0;

		this.refreshUI();
	}

	getSelectedAction()
	{
		if ((this.selectionIndex <  0) ||
		    (this.selectionIndex >= this.actionList.length))
			return null;
		
		return this.actionList[this.selectionIndex];
	}

	prevAction()
	{
		if (this.selectionIndex < 0) return;
		
		this.selectionIndex--;
		this.selectionIndex += this.actionList.length;
		this.selectionIndex %= this.actionList.length;
		this.refreshUI();
	}

	nextAction()
	{
		if (this.selectionIndex < 0) return;
		
		this.selectionIndex++;
		this.selectionIndex %= this.actionList.length;
		this.refreshUI();
	}

	activateAction(inverted)
	{
		var action = this.getSelectedAction();
		action.apply(this.puzzleData, inverted);
	}

	refreshUI()
	{
		var minX = g_gameCanvas.width;
		var minY = g_gameCanvas.height;
		var maxX = -1;
		var maxY = -1;
		
		for (var i = 0; i < this.actionList.length; i++)
		{
			var action = this.actionList[i];
			
			var actionMinX = action.getMinX();
			var actionMinY = action.getMinY();
			var actionMaxX = action.getMaxX();
			var actionMaxY = action.getMaxY();
			
			if (actionMinX < minX) minX = actionMinX;
			if (actionMinY < minY) minY = actionMinY;
			if (actionMaxX > maxX) maxX = actionMaxX;
			if (actionMaxY > maxY) maxY = actionMaxY;
		}
		
		this.panelW = maxX - minX + this.BORDER_LEFT + this.BORDER_RIGHT;
		this.panelH = maxY - minY + this.BORDER_TOP  + this.BORDER_BOTTOM;;
		this.panelX = minX - this.BORDER_LEFT;
		this.panelY = minY - this.BORDER_TOP;

		var selectedAction = this.getSelectedAction();
		if (selectedAction == null) return;

		var actionMinX = selectedAction.getMinX();
		var actionMinY = selectedAction.getMinY();
		var actionMaxX = selectedAction.getMaxX();
		var actionMaxY = selectedAction.getMaxY();
		
		this.selectionX =              actionMinX -     this.SELECTION_BORDER;
		this.selectionY =              actionMinY -     this.SELECTION_BORDER;
		this.selectionW = actionMaxX - actionMinX + 2 * this.SELECTION_BORDER;
		this.selectionH = actionMaxY - actionMinY + 2 * this.SELECTION_BORDER;
	}

	drawUI(context)
	{
		if (this.puzzleData == null) return;
		if (this.actionList.length == 0) return;

		// Draw the background
		fillRectUI(context,
				   this.PANEL_COLOR,
				   this.panelX,
				   this.panelY,
				   this.panelW,
				   this.panelH);

		// Highlight the selected action
		fillRectUI(context,
				   this.SELECTION_COLOR,
				   this.selectionX,
				   this.selectionY,
				   this.selectionW,
				   this.selectionH);

		// Draw the actions
		for (var i = 0; i < this.actionList.length; i++)
			this.actionList[i].drawUI(context);
	}
}



// puzzles/AGP.puz
function AGP()
{
    var builder = new PuzzleBuilder('AGP');

    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [5, 6], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6], [2, 7]]);
    builder.addPermutation('#0000ff', [[3, 8], [4, 9], [5, 10], [6, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGM');

    builder.addHarder('AGR');

    builder.addLocalMap('<image src="images/map_AGP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGM" alt="AGM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGP" alt="AGP">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGR" alt="AGR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHG.puz
function AHG()
{
    var builder = new PuzzleBuilder('AHG');

    builder.addNode('p', '#ff0000', '13', 0, -1);
    builder.addNode('q', '#7f007f', '8', -1, 0);
    builder.addNode('r', '#7f007f', '8', 1, 0);
    builder.addNode('s', '#0000ff', '6', 0, 1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#0000ff', [[0, 2], [1, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAE');
    builder.addEasier('AAR');

    builder.addHarder('AFS');
    builder.addHarder('AFW');

    builder.addLocalMap('<image src="images/map_AHG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AAE" alt="AAE">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AAR" alt="AAR">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFS" alt="AFS">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AFW" alt="AFW">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHG" alt="AHG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGJ.puz
function AGJ()
{
    var builder = new PuzzleBuilder('AGJ');

    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p30', '#00ff00', '22', 3, 0);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[3, 4], [7, 8]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [6, 10], [7, 11]]);
    builder.addPermutation('#0000ff', [[2, 6], [3, 7], [4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGH');

    builder.addLocalMap('<image src="images/map_AGJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGH" alt="AGH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGJ" alt="AGJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHW.puz
function AHW()
{
    var builder = new PuzzleBuilder('AHW');

    builder.addNode('p0', '#ff0000', '13', 2, 2);
    builder.addNode('p1', '#ffff00', '0', 4, 2);
    builder.addNode('p2', '#7f007f', '8', 2, 4);
    builder.addNode('p3', '#00ffff', '17', 4, 4);
    builder.addNode('p4', '#ff0000', '13', 0, 0);
    builder.addNode('p5', '#ffff00', '0', 6, 0);
    builder.addNode('p6', '#00ffff', '17', 6, 6);
    builder.addNode('p7', '#7f007f', '8', 0, 6);
    builder.addPermutation('#ff0000', [[0, 4, 5, 1]]);
    builder.addPermutation('#ffff00', [[1, 5, 6, 3]]);
    builder.addPermutation('#00ff00', [[2, 3, 6, 7]]);
    builder.addPermutation('#0000ff', [[0, 2, 7, 4]]);
    builder.addPermutation('#7f007f', [[0, 1, 3, 2]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABU');

    builder.addHarder('ABC');
    builder.addHarder('AHY');

    builder.addLocalMap('<image src="images/map_AHW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABC" alt="ABC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ABU" alt="ABU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHW" alt="AHW">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHY" alt="AHY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFS.puz
function AFS()
{
    var builder = new PuzzleBuilder('AFS');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#0000ff', '6', 2, 1);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#ffff00', [[2, 3]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3]]);
    builder.addPermutation('#0000ff', [[2, 4], [3, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHG');

    builder.addHarder('AFU');
    builder.addHarder('AFV');

    builder.addLocalMap('<image src="images/map_AFS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFS" alt="AFS">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AFU" alt="AFU">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFV" alt="AFV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AHG" alt="AHG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AES.puz
function AES()
{
    var builder = new PuzzleBuilder('AES');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 1.5000, -0.8660);
    builder.addNode('p3', '#00ffff', '17', 2.5000, -0.8660);
    builder.addNode('p4', '#0000ff', '6', 3.0000, -1.7321);
    builder.addNode('p5', '#7f007f', '8', 2.5000, -2.5981);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);
    builder.addPermutation('#00ff00', [[4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AER');
    builder.addEasier('AFK');

    builder.addHarder('AEA');

    builder.addLocalMap('<image src="images/map_AES.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AEA" alt="AEA">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AER" alt="AER">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AES" alt="AES">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AFK" alt="AFK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAJ.puz
function AAJ()
{
    var builder = new PuzzleBuilder('AAJ');

    builder.addNode('lhs1', '#ff0000', '13', 1, 1);
    builder.addNode('lhs2', '#ff7f00', '10', 1, 4);
    builder.addNode('lhs3', '#ffff00', '0', 1, 7);
    builder.addNode('rhs1', '#00ff00', '22', 4, 1);
    builder.addNode('rhs2', '#00ffff', '17', 4, 4);
    builder.addNode('rhs3', '#0000ff', '6', 4, 7);
    builder.addNode('rhs4', '#ff00ff', '4', 4, 10);
    builder.addNode('rhs5', '#7f007f', '8', 4, 13);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addPermutation('#0000ff', [[3, 4, 5, 6, 7]]);
    builder.addCircleArc('#ff0000', 'lhs3', 6.6, true, false, true);
    builder.addCircleArc('#0000ff', 'rhs5', 11.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEK');

    builder.addHarder('AAK');
    builder.addHarder('ADU');

    builder.addLocalMap('<image src="images/map_AAJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AAJ" alt="AAJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAK" alt="AAK">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ADU" alt="ADU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEK" alt="AEK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAZ.puz
function AAZ()
{
    var builder = new PuzzleBuilder('AAZ');

    builder.addNode('r1c2', '#ff0000', '13', 4, 1);
    builder.addNode('r2c1', '#ff7f00', '10', 1, 4);
    builder.addNode('r2c3', '#ff7f00', '10', 7, 4);
    builder.addNode('r3c1', '#ffff00', '0', 1, 7);
    builder.addNode('r3c3', '#ffff00', '0', 7, 7);
    builder.addNode('r4c2', '#00ff00', '22', 4, 10);
    builder.addNode('r5c1', '#00ffff', '17', 1, 13);
    builder.addNode('r5c3', '#00ffff', '17', 7, 13);
    builder.addNode('r6c1', '#0000ff', '6', 1, 16);
    builder.addNode('r6c3', '#0000ff', '6', 7, 16);
    builder.addNode('r7c2', '#7f007f', '8', 4, 19);
    builder.addPermutation('#ff0000', [[5, 3, 1, 0, 2, 4]]);
    builder.addPermutation('#0000ff', [[5, 7, 9, 10, 8, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADS');

    builder.addLocalMap('<image src="images/map_AAZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AAZ" alt="AAZ">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ADS" alt="ADS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAS.puz
function AAS()
{
    var builder = new PuzzleBuilder('AAS');

    builder.addNode('coord11', '#ff0000', '13', 1, 1);
    builder.addNode('coord21', '#ffff00', '0', 4, 1);
    builder.addNode('coord22', '#00ff00', '22', 4, 4);
    builder.addNode('coord32', '#0000ff', '6', 7, 1);
    builder.addNode('coord33', '#7f007f', '8', 4, -2);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#00ff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[2, 3]]);
    builder.addPermutation('#ffff00', [[3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADB');

    builder.addHarder('ADT');
    builder.addHarder('ADZ');
    builder.addHarder('AEN');
    builder.addHarder('AEO');
    builder.addHarder('AEY');

    builder.addLocalMap('<image src="images/map_AAS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,128.571428571,300.0,228.571428571" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-14.2857142857,300.0,85.7142857143" href="index.html?puzzle=ADB" alt="ADB">');
    builder.addLocalMap('<area shape="rect" coords="-14.2857142857,271.428571429,85.7142857143,371.428571429" href="index.html?puzzle=ADT" alt="ADT">');
    builder.addLocalMap('<area shape="rect" coords="200.0,271.428571429,300.0,371.428571429" href="index.html?puzzle=ADZ" alt="ADZ">');
    builder.addLocalMap('<area shape="rect" coords="414.285714286,271.428571429,514.285714286,371.428571429" href="index.html?puzzle=AEN" alt="AEN">');
    builder.addLocalMap('<area shape="rect" coords="307.142857143,271.428571429,407.142857143,371.428571429" href="index.html?puzzle=AEO" alt="AEO">');
    builder.addLocalMap('<area shape="rect" coords="92.8571428571,271.428571429,192.857142857,371.428571429" href="index.html?puzzle=AEY" alt="AEY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAT.puz
function AAT()
{
    var builder = new PuzzleBuilder('AAT');

    builder.addNode('r1c2', '#ff0000', '13', 4, 1);
    builder.addNode('r2c1', '#ff7f00', '10', 1, 4);
    builder.addNode('r2c2', '#ffff00', '0', 4, 4);
    builder.addNode('r2c3', '#00ff00', '22', 7, 4);
    builder.addNode('r3c1', '#0000ff', '6', 1, 7);
    builder.addNode('r3c3', '#7f007f', '8', 7, 7);
    builder.addPermutation('#ff0000', [[4, 1, 2, 3, 5]]);
    builder.addPermutation('#0000ff', [[0, 2]]);
    builder.addCircleArc('#0000ff', 'r1c2', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r2c2', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABA');

    builder.addHarder('AAG');
    builder.addHarder('AAU');

    builder.addLocalMap('<image src="images/map_AAT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAG" alt="AAG">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AAT" alt="AAT">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AAU" alt="AAU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ABA" alt="ABA">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABR.puz
function ABR()
{
    var builder = new PuzzleBuilder('ABR');

    builder.addNode('p1', '#ff0000', '13', -2.0000, 3.4641);
    builder.addNode('p2', '#ff0000', '13', 0.0000, 3.4641);
    builder.addNode('p3', '#ffff00', '0', -5.0000, 1.7321);
    builder.addNode('p4', '#ffff00', '0', -3.0000, 1.7321);
    builder.addNode('p5', '#ffff00', '0', -1.0000, 1.7321);
    builder.addNode('p6', '#00ff00', '22', -6.0000, -0.0000);
    builder.addNode('p7', '#00ff00', '22', -4.0000, -0.0000);
    builder.addNode('p8', '#00ff00', '22', -2.0000, -0.0000);
    builder.addNode('p9', '#00ff00', '22', 0.0000, 0.0000);
    builder.addNode('p10', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p11', '#00ff00', '22', 4.0000, 0.0000);
    builder.addNode('p12', '#0000ff', '6', -5.0000, -1.7321);
    builder.addNode('p13', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p14', '#0000ff', '6', 1.0000, -1.7321);
    builder.addNode('p15', '#0000ff', '6', 3.0000, -1.7321);
    builder.addNode('p16', '#7f007f', '8', -2.0000, -3.4641);
    builder.addNode('p17', '#7f007f', '8', -0.0000, -3.4641);
    builder.addNode('p18', '#7f007f', '8', 2.0000, -3.4641);
    builder.addPermutation('#ff0000', [[2, 6, 5], [13, 17, 16]]);
    builder.addPermutation('#00ff00', [[3, 7, 6], [8, 13, 12]]);
    builder.addPermutation('#0000ff', [[0, 1, 4], [5, 6, 11]]);
    builder.addPermutation('#ffff00', [[0, 4, 3], [12, 16, 15]]);
    builder.addPermutation('#00ffff', [[7, 8, 12], [9, 10, 14]]);
    builder.addPermutation('#7f007f', [[4, 8, 7], [9, 14, 13]]);
    builder.addCircleArc('#ff0000', 'p3', 1.20185042515, false, false, false);
    builder.addCircleArc('#ff0000', 'p7', 1.20185042515, false, false, false);
    builder.addCircleArc('#ff0000', 'p6', 1.20185042515, false, true, false);
    builder.addCircleArc('#ff0000', 'p14', 1.20185042515, false, false, false);
    builder.addCircleArc('#ff0000', 'p18', 1.20185042515, false, false, false);
    builder.addCircleArc('#ff0000', 'p17', 1.20185042515, false, true, false);
    builder.addCircleArc('#00ff00', 'p4', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ff00', 'p8', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ff00', 'p7', 1.20185042515, false, true, false);
    builder.addCircleArc('#00ff00', 'p9', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ff00', 'p14', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ff00', 'p13', 1.20185042515, false, true, false);
    builder.addCircleArc('#0000ff', 'p1', 1.20185042515, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 1.20185042515, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 1.20185042515, false, true, false);
    builder.addCircleArc('#0000ff', 'p6', 1.20185042515, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 1.20185042515, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 1.20185042515, false, true, false);
    builder.addCircleArc('#ffff00', 'p1', 1.20185042515, false, false, false);
    builder.addCircleArc('#ffff00', 'p5', 1.20185042515, false, false, false);
    builder.addCircleArc('#ffff00', 'p4', 1.20185042515, false, true, false);
    builder.addCircleArc('#ffff00', 'p13', 1.20185042515, false, false, false);
    builder.addCircleArc('#ffff00', 'p17', 1.20185042515, false, false, false);
    builder.addCircleArc('#ffff00', 'p16', 1.20185042515, false, true, false);
    builder.addCircleArc('#00ffff', 'p8', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ffff', 'p9', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ffff', 'p13', 1.20185042515, false, true, false);
    builder.addCircleArc('#00ffff', 'p10', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ffff', 'p11', 1.20185042515, false, false, false);
    builder.addCircleArc('#00ffff', 'p15', 1.20185042515, false, true, false);
    builder.addCircleArc('#7f007f', 'p5', 1.20185042515, false, false, false);
    builder.addCircleArc('#7f007f', 'p9', 1.20185042515, false, false, false);
    builder.addCircleArc('#7f007f', 'p8', 1.20185042515, false, true, false);
    builder.addCircleArc('#7f007f', 'p10', 1.20185042515, false, false, false);
    builder.addCircleArc('#7f007f', 'p15', 1.20185042515, false, false, false);
    builder.addCircleArc('#7f007f', 'p14', 1.20185042515, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAQ');
    builder.addEasier('AAX');
    builder.addEasier('ABE');
    builder.addEasier('AIF');

    builder.addLocalMap('<image src="images/map_ABR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,-4.54545454545,95.4545454545,95.4545454545" href="index.html?puzzle=AAQ" alt="AAQ">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,-4.54545454545,504.545454545,95.4545454545" href="index.html?puzzle=AAX" alt="AAX">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,-4.54545454545,231.818181818,95.4545454545" href="index.html?puzzle=ABE" alt="ABE">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=ABR" alt="ABR">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,-4.54545454545,368.181818182,95.4545454545" href="index.html?puzzle=AIF" alt="AIF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADN.puz
function ADN()
{
    var builder = new PuzzleBuilder('ADN');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ff0000', '13', -1.5000, -0.8660);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[0, 4, 3]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAR');
    builder.addEasier('ABA');
    builder.addEasier('AEF');

    builder.addHarder('ABK');
    builder.addHarder('ADO');
    builder.addHarder('ADW');
    builder.addHarder('AEK');

    builder.addLocalMap('<image src="images/map_ADN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=AAR" alt="AAR">');
    builder.addLocalMap('<area shape="rect" coords="63.6363636364,-4.54545454545,163.636363636,95.4545454545" href="index.html?puzzle=ABA" alt="ABA">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=ABK" alt="ABK">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=ADO" alt="ADO">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=ADW" alt="ADW">');
    builder.addLocalMap('<area shape="rect" coords="336.363636364,-4.54545454545,436.363636364,95.4545454545" href="index.html?puzzle=AEF" alt="AEF">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AEK" alt="AEK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGN.puz
function AGN()
{
    var builder = new PuzzleBuilder('AGN');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#0000ff', '6', 0, 3);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#0000ff', '6', 1, 2);
    builder.addNode('p13', '#7f007f', '8', 1, 3);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#0000ff', '6', 2, 1);
    builder.addNode('p30', '#0000ff', '6', 3, 0);
    builder.addNode('p31', '#7f007f', '8', 3, 1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[1, 2], [5, 6]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 6], [3, 7], [8, 10], [9, 11]]);
    builder.addPermutation('#0000ff', [[4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGH');

    builder.addLocalMap('<image src="images/map_AGN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGH" alt="AGH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGN" alt="AGN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGA.puz
function AGA()
{
    var builder = new PuzzleBuilder('AGA');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p30', '#00ffff', '17', 3, 0);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p41', '#7f007f', '8', 4, 1);
    builder.addNode('p42', '#ff00ff', '4', 4, 2);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6], [8, 9]]);
    builder.addPermutation('#ffff00', [[3, 4], [6, 7], [9, 10], [11, 12]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [5, 8], [6, 9]]);
    builder.addPermutation('#0000ff', [[3, 6], [4, 7], [9, 11], [10, 12]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFZ');

    builder.addLocalMap('<image src="images/map_AGA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AFZ" alt="AFZ">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGA" alt="AGA">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAU.puz
function AAU()
{
    var builder = new PuzzleBuilder('AAU');

    builder.addNode('upperleft', '#ff0000', '13', 3, 1);
    builder.addNode('upperright', '#ffff00', '0', 7, 1);
    builder.addNode('midleft', '#00ff00', '22', 1, 4);
    builder.addNode('midright', '#0000ff', '6', 9, 4);
    builder.addNode('bottom', '#7f007f', '8', 5, 7);
    builder.addPermutation('#ff0000', [[4, 2, 0, 1, 3]]);
    builder.addPermutation('#0000ff', [[4, 1, 2, 3, 0]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAT');

    builder.addHarder('AAY');

    builder.addLocalMap('<image src="images/map_AAU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAT" alt="AAT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAU" alt="AAU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAY" alt="AAY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAW.puz
function AAW()
{
    var builder = new PuzzleBuilder('AAW');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p11', '#ff0000', '13', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p22', '#00ff00', '22', 2, 2);
    builder.addNode('p23', '#00ff00', '22', 2, 3);
    builder.addNode('p33', '#0000ff', '6', 3, 3);
    builder.addNode('p34', '#0000ff', '6', 3, 4);
    builder.addNode('p44', '#0000ff', '6', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#ffff00', [[1, 2], [5, 6]]);
    builder.addPermutation('#00ff00', [[2, 3], [6, 7]]);
    builder.addPermutation('#0000ff', [[3, 4], [7, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEA');

    builder.addHarder('AAL');

    builder.addLocalMap('<image src="images/map_AAW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAL" alt="AAL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAW" alt="AAW">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AEA" alt="AEA">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABN.puz
function ABN()
{
    var builder = new PuzzleBuilder('ABN');

    builder.addNode('p1', '#7f007f', '8', -0.0000, -2.0000);
    builder.addNode('p2', '#7f007f', '8', 2.0000, 0.0000);
    builder.addNode('p3', '#7f007f', '8', 0.0000, 2.0000);
    builder.addNode('p4', '#7f007f', '8', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', '13', -0.0000, -5.0000);
    builder.addNode('p6', '#ffff00', '0', 5.0000, 0.0000);
    builder.addNode('p7', '#ffff00', '0', 9.0000, 0.0000);
    builder.addNode('p8', '#00ff00', '22', 0.0000, 5.0000);
    builder.addNode('p9', '#00ff00', '22', -1.7321, 8.0000);
    builder.addNode('p10', '#00ff00', '22', 1.7321, 8.0000);
    builder.addNode('p11', '#0000ff', '6', -5.0000, 0.0000);
    builder.addNode('p12', '#0000ff', '6', -7.0000, -2.0000);
    builder.addNode('p13', '#0000ff', '6', -9.0000, 0.0000);
    builder.addNode('p14', '#0000ff', '6', -7.0000, 2.0000);
    builder.addPermutation('#ff0000', [[0, 3, 2, 1]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 7], [3, 10]]);
    builder.addPermutation('#0000ff', [[5, 6], [7, 8, 9], [10, 11, 12, 13]]);
    builder.addCircleArc('#ff0000', 'p1', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 2.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p9', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 2.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p13', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 2.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACN');

    builder.addHarder('ABO');
    builder.addHarder('ABS');

    builder.addLocalMap('<image src="images/map_ABN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABN" alt="ABN">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ABO" alt="ABO">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABS" alt="ABS">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ACN" alt="ACN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHL.puz
function AHL()
{
    var builder = new PuzzleBuilder('AHL');

    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addPermutation('#0000ff', [[5, 13]]);
    builder.addPermutation('#ff00ff', [[7, 4], [8, 9]]);
    builder.addPermutation('#00ff00', [[2, 0], [6, 1], [14, 12], [10, 3], [11, 13]]);
    builder.addPermutation('#ffff00', [[13, 6], [1, 11], [4, 15], [9, 5], [12, 8], [3, 7]]);
    builder.addPermutation('#ff0000', [[13, 10], [0, 14]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHI');
    builder.addEasier('AHM');

    builder.addHarder('AHK');
    builder.addHarder('AHO');

    builder.addLocalMap('<image src="images/map_AHL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AHI" alt="AHI">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHK" alt="AHK">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHL" alt="AHL">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHM" alt="AHM">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHO" alt="AHO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABA.puz
function ABA()
{
    var builder = new PuzzleBuilder('ABA');

    builder.addNode('top', '#ffff00', '0', 4, 1);
    builder.addNode('mid', '#ff0000', '13', 4, 4);
    builder.addNode('lhs', '#0000ff', '6', 1, 7);
    builder.addNode('rhs', '#00ff00', '22', 7, 7);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[2, 1, 3]]);
    builder.addCircleArc('#ff0000', 'top', 2.2, false, true, false);
    builder.addCircleArc('#ff0000', 'mid', 2.2, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADA');

    builder.addHarder('AAT');
    builder.addHarder('ADN');

    builder.addLocalMap('<image src="images/map_ABA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAT" alt="AAT">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABA" alt="ABA">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ADA" alt="ADA">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABI.puz
function ABI()
{
    var builder = new PuzzleBuilder('ABI');

    builder.addNode('r1c2', '#ff0000', '13', 4, 1);
    builder.addNode('r1c4', '#ff0000', '13', 10, 1);
    builder.addNode('r2c1', '#ffff00', '0', 1, 4);
    builder.addNode('r2c3', '#ffff00', '0', 7, 4);
    builder.addNode('r2c5', '#ffff00', '0', 13, 4);
    builder.addNode('r3c2', '#00ff00', '22', 4, 7);
    builder.addNode('r3c4', '#00ff00', '22', 10, 7);
    builder.addNode('r4c3', '#0000ff', '6', 7, 10);
    builder.addNode('r4c5', '#0000ff', '6', 13, 10);
    builder.addNode('r5c3', '#7f007f', '8', 7, 13);
    builder.addNode('r5c5', '#7f007f', '8', 13, 13);
    builder.addPermutation('#ff0000', [[2, 0, 3, 5], [7, 6, 8, 10, 9]]);
    builder.addPermutation('#0000ff', [[3, 1, 4, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABH');

    builder.addLocalMap('<image src="images/map_ABI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ABH" alt="ABH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ABI" alt="ABI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEY.puz
function AEY()
{
    var builder = new PuzzleBuilder('AEY');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 0.3090, 0.9511);
    builder.addNode('p3', '#00ffff', '17', -0.5000, 1.5388);
    builder.addNode('p4', '#0000ff', '6', 0.3090, -0.9511);
    builder.addNode('p5', '#7f007f', '8', -0.5000, -1.5388);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[0, 4]]);
    builder.addPermutation('#7f007f', [[4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAD');
    builder.addEasier('AAS');

    builder.addHarder('AEZ');
    builder.addHarder('AFH');
    builder.addHarder('AFM');

    builder.addLocalMap('<image src="images/map_AEY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="225.0,0.0,325.0,100.0" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AEY" alt="AEY">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AEZ" alt="AEZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AFH" alt="AFH">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFM" alt="AFM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADG.puz
function ADG()
{
    var builder = new PuzzleBuilder('ADG');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 8]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 7]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADE');

    builder.addHarder('ADK');

    builder.addLocalMap('<image src="images/map_ADG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADE" alt="ADE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ADG" alt="ADG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADK" alt="ADK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHB.puz
function AHB()
{
    var builder = new PuzzleBuilder('AHB');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#00ffff', '17', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p30', '#00ff00', '22', 3, 0);
    builder.addNode('p31', '#00ffff', '17', 3, 1);
    builder.addNode('p32', '#0000ff', '6', 3, 2);
    builder.addNode('p33', '#7f007f', '8', 3, 3);
    builder.addPermutation('#ff0000', [[4, 5], [6, 7], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[0, 1], [2, 3], [5, 6]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [4, 8], [5, 9], [6, 10], [7, 11]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHA');

    builder.addHarder('AHC');

    builder.addLocalMap('<image src="images/map_AHB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AHA" alt="AHA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AHB" alt="AHB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHC" alt="AHC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEZ.puz
function AEZ()
{
    var builder = new PuzzleBuilder('AEZ');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', -1, -1);
    builder.addNode('p3', '#00ffff', '17', -2, 0);
    builder.addNode('p4', '#0000ff', '6', 0, -1);
    builder.addNode('p5', '#7f007f', '8', 1, -1);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[0, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEY');

    builder.addHarder('AFA');
    builder.addHarder('AFC');

    builder.addLocalMap('<image src="images/map_AEZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEY" alt="AEY">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEZ" alt="AEZ">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AFA" alt="AFA">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFC" alt="AFC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AED.puz
function AED()
{
    var builder = new PuzzleBuilder('AED');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p7', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p11', '#7f007f', '8', 1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [1, 6], [4, 8]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 7], [5, 9]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADI');

    builder.addHarder('ACZ');
    builder.addHarder('ADL');

    builder.addLocalMap('<image src="images/map_AED.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ACZ" alt="ACZ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADL" alt="ADL">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AED" alt="AED">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGI.puz
function AGI()
{
    var builder = new PuzzleBuilder('AGI');

    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p04', '#00ffff', '17', 0, 4);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#00ffff', '17', 1, 3);
    builder.addNode('p14', '#0000ff', '6', 1, 4);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#00ffff', '17', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p24', '#7f007f', '8', 2, 4);
    builder.addPermutation('#ff0000', [[2, 3], [4, 5], [7, 8], [9, 10]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [5, 6], [8, 9], [10, 11]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6]]);
    builder.addPermutation('#0000ff', [[2, 7], [3, 8], [4, 9], [5, 10], [6, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGG');

    builder.addHarder('AGK');

    builder.addLocalMap('<image src="images/map_AGI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGG" alt="AGG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGI" alt="AGI">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGK" alt="AGK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFR.puz
function AFR()
{
    var builder = new PuzzleBuilder('AFR');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addPermutation('#ff0000', [[0, 3], [1, 4]]);
    builder.addPermutation('#ffff00', [[3, 6], [4, 7]]);
    builder.addPermutation('#00ff00', [[2, 3], [4, 5]]);
    builder.addPermutation('#0000ff', [[3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFP');

    builder.addHarder('AAL');

    builder.addLocalMap('<image src="images/map_AFR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAL" alt="AAL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFP" alt="AFP">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFR" alt="AFR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABY.puz
function ABY()
{
    var builder = new PuzzleBuilder('ABY');

    builder.addNode('p1', '#7f007f', '8', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', '8', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', '6', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', '6', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', '6', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', '8', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', '6', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', '17', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', '17', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', '17', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', '22', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', '22', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', '0', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', '0', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', '0', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', '22', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', '0', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', '13', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', '13', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', '13', -16.5000, -2.5981);
    builder.addPermutation('#ff0000', [[16, 14, 19, 18, 17, 12], [6, 2, 7, 8, 9, 4]]);
    builder.addPermutation('#ffff00', [[10, 15, 14, 13, 12, 11], [0, 1, 2, 3, 4, 5]]);
    builder.addPermutation('#7f007f', [[8, 10]]);
    builder.addCircleArc('#ff0000', 'p17', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p15', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p20', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p19', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p18', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p11', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p16', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p15', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p14', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p12', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p7', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p3', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p8', 3.0, true, false, true);
    builder.addCircleArc('#ff0000', 'p9', 3.0, true, false, true);
    builder.addCircleArc('#ff0000', 'p10', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p1', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p2', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p3', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p4', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p6', 3.0, true, false, false);
    builder.addCircleArc('#7f007f', 'p9', 3.0, false, false, false);
    builder.addCircleArc('#7f007f', 'p11', 3.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABX');

    builder.addLocalMap('<image src="images/map_ABY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ABY" alt="ABY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABF.puz
function ABF()
{
    var builder = new PuzzleBuilder('ABF');

    builder.addNode('r1c1', '#ff0000', '13', 1, 1);
    builder.addNode('r1c2', '#ffff00', '0', 4, 1);
    builder.addNode('r2c1', '#ffff00', '0', 1, 4);
    builder.addNode('r2c2', '#00ff00', '22', 4, 4);
    builder.addNode('r2c3', '#0000ff', '6', 7, 4);
    builder.addNode('r2c5', '#ffff00', '0', 13, 4);
    builder.addNode('r3c2', '#0000ff', '6', 4, 7);
    builder.addNode('r3c3', '#ff0000', '13', 7, 7);
    builder.addNode('r3c4', '#ffff00', '0', 10, 7);
    builder.addNode('r3c5', '#00ff00', '22', 13, 7);
    builder.addNode('r4c3', '#ffff00', '0', 7, 10);
    builder.addNode('r4c4', '#00ff00', '22', 10, 10);
    builder.addNode('r4c5', '#0000ff', '6', 13, 10);
    builder.addNode('r5c4', '#0000ff', '6', 10, 13);
    builder.addPermutation('#ff0000', [[0, 2], [1, 3], [7, 10], [8, 11], [9, 12]]);
    builder.addPermutation('#ffff00', [[3, 6], [4, 7], [5, 9], [11, 13]]);
    builder.addPermutation('#00ff00', [[0, 1], [2, 3], [7, 8], [10, 11]]);
    builder.addPermutation('#0000ff', [[3, 4], [6, 7], [8, 9], [11, 12]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHD');

    builder.addLocalMap('<image src="images/map_ABF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ABF" alt="ABF">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AHD" alt="AHD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEV.puz
function AEV()
{
    var builder = new PuzzleBuilder('AEV');

    builder.addNode('lhs', '#ff0000', '13', 1, 1);
    builder.addNode('mid', '#ffff00', '0', 4, 4);
    builder.addNode('rhs', '#0000ff', '6', 7, 4);
    builder.addNode('top', '#7f007f', '8', 7, 7);
    builder.addNode('bot', '#00ff00', '22', 4, 7);
    builder.addNode('six', '#00ffff', '17', 4, 10);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[1, 4], [2, 3]]);
    builder.addPermutation('#7f007f', [[5, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFD');

    builder.addHarder('AET');
    builder.addHarder('AEU');

    builder.addLocalMap('<image src="images/map_AEV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AET" alt="AET">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AEU" alt="AEU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEV" alt="AEV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AFD" alt="AFD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFL.puz
function AFL()
{
    var builder = new PuzzleBuilder('AFL');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 1.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', 2.5000, 0.8660);
    builder.addNode('p4', '#0000ff', '6', 3.0000, -0.0000);
    builder.addNode('p5', '#7f007f', '8', 2.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5]]);
    builder.addPermutation('#0000ff', [[3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AER');
    builder.addEasier('AFJ');

    builder.addLocalMap('<image src="images/map_AFL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AER" alt="AER">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AFJ" alt="AFJ">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AFL" alt="AFL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHK.puz
function AHK()
{
    var builder = new PuzzleBuilder('AHK');

    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addPermutation('#0000ff', [[6, 1], [8, 9], [10, 3], [11, 13]]);
    builder.addPermutation('#00ff00', [[2, 0], [7, 4], [5, 13], [14, 12]]);
    builder.addPermutation('#ffff00', [[13, 6], [1, 11], [4, 15], [9, 5], [12, 8], [3, 7]]);
    builder.addPermutation('#ff0000', [[13, 10], [0, 14]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFT');
    builder.addEasier('AHL');

    builder.addHarder('AHN');

    builder.addLocalMap('<image src="images/map_AHK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AFT" alt="AFT">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHK" alt="AHK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHL" alt="AHL">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AHN" alt="AHN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AID.puz
function AID()
{
    var builder = new PuzzleBuilder('AID');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ff0000', '13', 0.3090, 0.9511);
    builder.addNode('p2', '#ff0000', '13', -0.8090, 0.5878);
    builder.addNode('p3', '#ff0000', '13', -0.8090, -0.5878);
    builder.addNode('p4', '#ff0000', '13', 0.3090, -0.9511);
    builder.addNode('p5', '#ffff00', '0', 2.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', 0.6180, 1.9021);
    builder.addNode('p7', '#ffff00', '0', -1.6180, 1.1756);
    builder.addNode('p8', '#ffff00', '0', -1.6180, -1.1756);
    builder.addNode('p9', '#ffff00', '0', 0.6180, -1.9021);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [2, 7]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 2], [3, 8]]);
    builder.addPermutation('#0000ff', [[0, 5], [1, 6], [2, 3], [4, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACQ');

    builder.addHarder('AIB');

    builder.addLocalMap('<image src="images/map_AID.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ACQ" alt="ACQ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AIB" alt="AIB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AID" alt="AID">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AET.puz
function AET()
{
    var builder = new PuzzleBuilder('AET');

    builder.addNode('lhs', '#ff0000', '13', -0.5000, 0.8660);
    builder.addNode('mid', '#ffff00', '0', 0, 0);
    builder.addNode('rhs', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('top', '#7f007f', '8', 1.5000, -0.8660);
    builder.addNode('bot', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('six', '#00ffff', '17', 2.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#ffff00', [[1, 2], [5, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEV');
    builder.addEasier('AEX');

    builder.addLocalMap('<image src="images/map_AET.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AET" alt="AET">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AEV" alt="AEV">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AEX" alt="AEX">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAD.puz
function AAD()
{
    var builder = new PuzzleBuilder('AAD');

    builder.addNode('lhs', '#ff0000', '13', 1, 4);
    builder.addNode('mid', '#ffff00', '0', 4, 4);
    builder.addNode('rhs', '#0000ff', '6', 7, 7);
    builder.addNode('top', '#7f007f', '8', 4, 10);
    builder.addNode('bot', '#00ff00', '22', 4, 7);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAC');
    builder.addEasier('ADB');

    builder.addHarder('AAP');
    builder.addHarder('ACR');
    builder.addHarder('AEY');
    builder.addHarder('AFD');
    builder.addHarder('AFN');

    builder.addLocalMap('<image src="images/map_AAD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="253.571428571,-14.2857142857,353.571428571,85.7142857143" href="index.html?puzzle=AAC" alt="AAC">');
    builder.addLocalMap('<area shape="rect" coords="200.0,128.571428571,300.0,228.571428571" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="92.8571428571,271.428571429,192.857142857,371.428571429" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="200.0,271.428571429,300.0,371.428571429" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="146.428571429,-14.2857142857,246.428571429,85.7142857143" href="index.html?puzzle=ADB" alt="ADB">');
    builder.addLocalMap('<area shape="rect" coords="307.142857143,271.428571429,407.142857143,371.428571429" href="index.html?puzzle=AEY" alt="AEY">');
    builder.addLocalMap('<area shape="rect" coords="414.285714286,271.428571429,514.285714286,371.428571429" href="index.html?puzzle=AFD" alt="AFD">');
    builder.addLocalMap('<area shape="rect" coords="-14.2857142857,271.428571429,85.7142857143,371.428571429" href="index.html?puzzle=AFN" alt="AFN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABG.puz
function ABG()
{
    var builder = new PuzzleBuilder('ABG');

    builder.addNode('r1c2', '#ff0000', '13', 4, 1);
    builder.addNode('r1c6', '#00ff00', '22', 16, 1);
    builder.addNode('r2c1', '#ff0000', '13', 1, 4);
    builder.addNode('r2c3', '#7f0000', '16', 7, 4);
    builder.addNode('r2c5', '#007f00', '19', 13, 4);
    builder.addNode('r2c7', '#00ff00', '22', 19, 4);
    builder.addNode('r3c2', '#7f0000', '16', 4, 7);
    builder.addNode('r3c3', '#7f0000', '16', 7, 7);
    builder.addNode('r3c5', '#007f00', '19', 13, 7);
    builder.addNode('r3c6', '#007f00', '19', 16, 7);
    builder.addNode('r4c4', '#7f7f7f', '20', 10, 10);
    builder.addNode('r5c2', '#7f007f', '8', 4, 13);
    builder.addNode('r5c3', '#7f007f', '8', 7, 13);
    builder.addNode('r5c5', '#0000ff', '6', 13, 13);
    builder.addNode('r5c6', '#0000ff', '6', 16, 13);
    builder.addNode('r6c1', '#ff00ff', '4', 1, 16);
    builder.addNode('r6c3', '#7f007f', '8', 7, 16);
    builder.addNode('r6c5', '#0000ff', '6', 13, 16);
    builder.addNode('r6c7', '#00ffff', '17', 19, 16);
    builder.addNode('r7c2', '#ff00ff', '4', 4, 19);
    builder.addNode('r7c6', '#00ffff', '17', 16, 19);
    builder.addPermutation('#ff0000', [[6, 7, 10, 12, 11], [4, 1, 5, 9]]);
    builder.addPermutation('#ffff00', [[16, 12, 10, 13, 17], [6, 2, 0, 3]]);
    builder.addPermutation('#00ff00', [[4, 8, 10, 7, 3], [14, 18, 20, 17]]);
    builder.addPermutation('#0000ff', [[14, 13, 10, 8, 9], [16, 19, 15, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABC');

    builder.addHarder('ABJ');

    builder.addLocalMap('<image src="images/map_ABG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABC" alt="ABC">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABG" alt="ABG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABJ" alt="ABJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACR.puz
function ACR()
{
    var builder = new PuzzleBuilder('ACR');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', -0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('p3', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('p4', '#7f007f', '8', 1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4]]);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addPermutation('#0000ff', [[0, 2]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAD');
    builder.addEasier('ACP');

    builder.addHarder('AAP');
    builder.addHarder('ACY');
    builder.addHarder('ADC');
    builder.addHarder('ADT');
    builder.addHarder('AFO');

    builder.addLocalMap('<image src="images/map_ACR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="253.571428571,-14.2857142857,353.571428571,85.7142857143" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="92.8571428571,271.428571429,192.857142857,371.428571429" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="146.428571429,-14.2857142857,246.428571429,85.7142857143" href="index.html?puzzle=ACP" alt="ACP">');
    builder.addLocalMap('<area shape="rect" coords="200.0,128.571428571,300.0,228.571428571" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="307.142857143,271.428571429,407.142857143,371.428571429" href="index.html?puzzle=ACY" alt="ACY">');
    builder.addLocalMap('<area shape="rect" coords="414.285714286,271.428571429,514.285714286,371.428571429" href="index.html?puzzle=ADC" alt="ADC">');
    builder.addLocalMap('<area shape="rect" coords="-14.2857142857,271.428571429,85.7142857143,371.428571429" href="index.html?puzzle=ADT" alt="ADT">');
    builder.addLocalMap('<area shape="rect" coords="200.0,271.428571429,300.0,371.428571429" href="index.html?puzzle=AFO" alt="AFO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEC.puz
function AEC()
{
    var builder = new PuzzleBuilder('AEC');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 1.5000, -0.8660);
    builder.addNode('p3', '#00ffff', '17', 2.5000, -0.8660);
    builder.addNode('p4', '#0000ff', '6', 3.0000, 0.0000);
    builder.addNode('p5', '#7f007f', '8', 4.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5]]);
    builder.addPermutation('#00ff00', [[3, 4]]);
    builder.addPermutation('#0000ff', [[1, 2]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADY');
    builder.addEasier('AEQ');
    builder.addEasier('AER');

    builder.addHarder('AEA');

    builder.addLocalMap('<image src="images/map_AEC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=ADY" alt="ADY">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEA" alt="AEA">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AEC" alt="AEC">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AEQ" alt="AEQ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AER" alt="AER">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEX.puz
function AEX()
{
    var builder = new PuzzleBuilder('AEX');

    builder.addNode('lhs', '#ff0000', '13', 1, -1);
    builder.addNode('mid', '#ffff00', '0', 0, 0);
    builder.addNode('rhs', '#0000ff', '6', 0, 1);
    builder.addNode('top', '#7f007f', '8', 1, 1);
    builder.addNode('bot', '#00ff00', '22', -1, -1);
    builder.addNode('six', '#00ffff', '17', 1, 0);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);
    builder.addPermutation('#7f007f', [[1, 2], [5, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFD');

    builder.addHarder('AET');

    builder.addLocalMap('<image src="images/map_AEX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AET" alt="AET">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AEX" alt="AEX">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFD" alt="AFD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFI.puz
function AFI()
{
    var builder = new PuzzleBuilder('AFI');

    builder.addNode('p00', '#ff0000', '13', 7, 0.0);
    builder.addNode('p10', '#ffff00', '0', 3, 3.0);
    builder.addNode('p11', '#ffff00', '0', 11, 3.0);
    builder.addNode('p20', '#00ff00', '22', 1, 6.0);
    builder.addNode('p21', '#00ff00', '22', 5, 6.0);
    builder.addNode('p22', '#00ff00', '22', 9, 6.0);
    builder.addNode('p23', '#00ff00', '22', 13, 6.0);
    builder.addNode('p30', '#0000ff', '6', 0, 9.0);
    builder.addNode('p31', '#0000ff', '6', 2, 9.0);
    builder.addNode('p32', '#0000ff', '6', 4, 9.0);
    builder.addNode('p33', '#0000ff', '6', 6, 9.0);
    builder.addNode('p34', '#7f007f', '8', 8, 9.0);
    builder.addNode('p35', '#7f007f', '8', 10, 9.0);
    builder.addNode('p36', '#7f007f', '8', 12, 9.0);
    builder.addNode('p37', '#7f007f', '8', 14, 9.0);
    builder.addPermutation('#ff0000', [[1, 3], [2, 5]]);
    builder.addPermutation('#0000ff', [[1, 4], [2, 6]]);
    builder.addPermutation('#00ff00', [[0, 1]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#00ffff', [[3, 7], [4, 9], [5, 11], [6, 13]]);
    builder.addPermutation('#7f007f', [[3, 8], [4, 10], [5, 12], [6, 14]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADT');

    builder.addHarder('ACS');

    builder.addLocalMap('<image src="images/map_AFI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACS" alt="ACS">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADT" alt="ADT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFI" alt="AFI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACC.puz
function ACC()
{
    var builder = new PuzzleBuilder('ACC');

    builder.addNode('p1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('p2', '#ffff00', '0', -3.5000, 0.8660);
    builder.addNode('p3', '#0000ff', '6', -3.5000, 4.3301);
    builder.addNode('p4', '#00ff00', '22', -1.5000, 4.3301);
    builder.addNode('p5', '#ff0000', '13', 1.5000, 0.8660);
    builder.addNode('p6', '#ffff00', '0', 2.5000, 2.5981);
    builder.addNode('p7', '#0000ff', '6', 5.5000, 0.8660);
    builder.addNode('p8', '#00ff00', '22', 4.5000, -0.8660);
    builder.addNode('p9', '#ff0000', '13', -0.0000, -1.7321);
    builder.addNode('p10', '#ffff00', '0', 1.0000, -3.4641);
    builder.addNode('p11', '#0000ff', '6', -2.0000, -5.1962);
    builder.addNode('p12', '#00ff00', '22', -3.0000, -3.4641);
    builder.addPermutation('#ff0000', [[0, 3], [1, 2]]);
    builder.addPermutation('#00ff00', [[4, 5], [6, 7]]);
    builder.addPermutation('#0000ff', [[8, 10], [9, 11]]);
    builder.addPermutation('#ffff00', [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]);
    builder.addCircleArc('#ff0000', 'p1', 3.46410161514, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 3.46410161514, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 3.46410161514, false, true, false);
    builder.addCircleArc('#ff0000', 'p3', 3.46410161514, false, false, false);
    builder.addCircleArc('#00ff00', 'p5', 2.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p6', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p7', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p8', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p1', 1.73205080757, false, false, false);
    builder.addCircleArc('#ffff00', 'p2', 3.60555127546, false, false, false);
    builder.addCircleArc('#ffff00', 'p3', 5.56776436283, false, false, false);
    builder.addCircleArc('#ffff00', 'p4', 4.58257569496, false, false, false);
    builder.addCircleArc('#ffff00', 'p5', 1.73205080757, false, false, false);
    builder.addCircleArc('#ffff00', 'p6', 3.60555127546, false, false, false);
    builder.addCircleArc('#ffff00', 'p7', 5.56776436283, false, false, false);
    builder.addCircleArc('#ffff00', 'p8', 4.58257569496, false, false, false);
    builder.addCircleArc('#ffff00', 'p9', 1.73205080757, false, true, false);
    builder.addCircleArc('#ffff00', 'p10', 3.60555127546, false, true, false);
    builder.addCircleArc('#ffff00', 'p11', 5.56776436283, false, true, false);
    builder.addCircleArc('#ffff00', 'p12', 4.58257569496, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAO');

    builder.addHarder('ACB');
    builder.addHarder('ACD');

    builder.addLocalMap('<image src="images/map_ACC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAO" alt="AAO">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ACB" alt="ACB">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACC" alt="ACC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACD" alt="ACD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIF.puz
function AIF()
{
    var builder = new PuzzleBuilder('AIF');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ff7f00', '10', 0.5000, 0.8660);
    builder.addNode('p2', '#ff7f00', '10', 1.0000, 0.0000);
    builder.addNode('p3', '#ffff00', '0', 1.5000, 0.8660);
    builder.addNode('p4', '#00ff00', '22', 2.0000, 1.7321);
    builder.addNode('p5', '#00ff00', '22', 2.5000, 0.8660);
    builder.addNode('p6', '#00ffff', '17', 3.0000, 1.7321);
    builder.addNode('p7', '#0000ff', '6', 3.5000, 2.5981);
    builder.addNode('p8', '#0000ff', '6', 4.0000, 1.7321);
    builder.addNode('p9', '#7f007f', '8', 4.5000, 2.5981);
    builder.addPermutation('#ff0000', [[0, 1, 2], [3, 4, 5], [6, 7, 8]]);
    builder.addPermutation('#0000ff', [[1, 3, 2], [4, 6, 5], [7, 9, 8]]);
    builder.addCircleArc('#ff0000', 'p0', 0.577346035272, false, true, false);
    builder.addCircleArc('#ff0000', 'p1', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 0.577346035272, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p5', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p6', 0.577346035272, false, true, false);
    builder.addCircleArc('#ff0000', 'p7', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p8', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p1', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 0.577346035272, false, true, false);
    builder.addCircleArc('#0000ff', 'p4', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 0.577346035272, false, true, false);
    builder.addCircleArc('#0000ff', 'p7', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 0.577346035272, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIG');

    builder.addHarder('ABR');

    builder.addLocalMap('<image src="images/map_AIF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABR" alt="ABR">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AIF" alt="AIF">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AIG" alt="AIG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAI.puz
function AAI()
{
    var builder = new PuzzleBuilder('AAI');

    builder.addNode('ul', '#ff0000', '13', 3, 1);
    builder.addNode('ur', '#ffff00', '0', 6, 1);
    builder.addNode('rhs', '#00ff00', '22', 8, 4);
    builder.addNode('br', '#00ffff', '17', 6, 7);
    builder.addNode('bl', '#0000ff', '6', 3, 7);
    builder.addNode('lhs', '#7f007f', '8', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1], [5, 4], [2, 3]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'bl', 2.2, true, false, true);
    builder.addCircleArc('#ff0000', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'br', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAH');

    builder.addHarder('AAO');

    builder.addLocalMap('<image src="images/map_AAI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAH" alt="AAH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAI" alt="AAI">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAO" alt="AAO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEF.puz
function AEF()
{
    var builder = new PuzzleBuilder('AEF');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#0000ff', '6', -0.5000, 0.8660);
    builder.addNode('p2', '#0000ff', '6', -0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addCircleArc('#ff0000', 'p0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'p1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'p2', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADA');

    builder.addHarder('ADN');

    builder.addLocalMap('<image src="images/map_AEF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADA" alt="ADA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AEF" alt="AEF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHN.puz
function AHN()
{
    var builder = new PuzzleBuilder('AHN');

    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addPermutation('#0000ff', [[0, 21], [20, 7], [9, 6], [28, 4], [3, 15], [17, 8], [5, 22], [13, 23], [24, 12], [16, 2]]);
    builder.addPermutation('#00ff00', [[25, 26], [5, 21], [1, 14], [27, 10], [18, 6], [11, 7]]);
    builder.addPermutation('#ffff00', [[4, 0], [26, 19], [6, 3], [15, 9], [23, 25], [7, 16], [21, 28], [8, 18], [10, 17], [12, 5]]);
    builder.addPermutation('#ff0000', [[2, 13], [7, 5], [14, 27], [6, 24], [21, 11], [22, 20]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHK');
    builder.addEasier('AHO');

    builder.addHarder('AHQ');

    builder.addLocalMap('<image src="images/map_AHN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AHK" alt="AHK">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHN" alt="AHN">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHO" alt="AHO">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AHQ" alt="AHQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFQ.puz
function AFQ()
{
    var builder = new PuzzleBuilder('AFQ');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.0000, 1.0000);
    builder.addNode('x2', '#ffff00', '0', -2.0000, 0.0000);
    builder.addNode('x3', '#ff0000', '13', -1.0000, -1.0000);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('z1', '#00ff00', '22', -2.6910, 0.9511);
    builder.addNode('z2', '#00ff00', '22', -3.8090, 0.5878);
    builder.addNode('z3', '#00ff00', '22', -3.8090, -0.5878);
    builder.addNode('z4', '#00ff00', '22', -2.6910, -0.9511);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3]]);
    builder.addPermutation('#0000ff', [[0, 5, 4], [2, 6, 7, 8, 9]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'z1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'z2', 1, true, false, true);
    builder.addCircleArc('#0000ff', 'z3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'z4', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADX');
    builder.addEasier('AEL');

    builder.addLocalMap('<image src="images/map_AFQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ADX" alt="ADX">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AEL" alt="AEL">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AFQ" alt="AFQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACE.puz
function ACE()
{
    var builder = new PuzzleBuilder('ACE');

    builder.addNode('p1', '#ff0000', '13', -5.0000, 5.1962);
    builder.addNode('p2', '#ff0000', '13', -6.0000, 3.4641);
    builder.addNode('p3', '#ff0000', '13', -7.0000, 1.7321);
    builder.addNode('p4', '#ff0000', '13', -5.0000, 8.6603);
    builder.addNode('p5', '#ff0000', '13', -6.0000, 10.3923);
    builder.addNode('p6', '#ff0000', '13', -7.0000, 12.1244);
    builder.addNode('p7', '#ffffff', '11', -2.0000, 6.9282);
    builder.addNode('p8', '#ffffff', '11', 0.0000, 6.9282);
    builder.addNode('p9', '#ffffff', '11', 2.0000, 6.9282);
    builder.addNode('p10', '#ffff00', '0', 5.0000, 8.6603);
    builder.addNode('p11', '#ffff00', '0', 6.0000, 10.3923);
    builder.addNode('p12', '#ffff00', '0', 7.0000, 12.1244);
    builder.addNode('p13', '#ffffff', '11', 5.0000, 5.1962);
    builder.addNode('p14', '#ffffff', '11', 6.0000, 3.4641);
    builder.addNode('p15', '#ffffff', '11', 7.0000, 1.7321);
    builder.addNode('p16', '#00ff00', '22', 10.0000, 0.0000);
    builder.addNode('p17', '#00ff00', '22', 12.0000, 0.0000);
    builder.addNode('p18', '#00ff00', '22', 14.0000, 0.0000);
    builder.addNode('p19', '#ffffff', '11', 7.0000, -1.7321);
    builder.addNode('p20', '#ffffff', '11', 6.0000, -3.4641);
    builder.addNode('p21', '#ffffff', '11', 5.0000, -5.1962);
    builder.addNode('p22', '#0000ff', '6', 5.0000, -8.6603);
    builder.addNode('p23', '#0000ff', '6', 6.0000, -10.3923);
    builder.addNode('p24', '#0000ff', '6', 7.0000, -12.1244);
    builder.addNode('p25', '#0000ff', '6', 2.0000, -6.9282);
    builder.addNode('p26', '#0000ff', '6', -0.0000, -6.9282);
    builder.addNode('p27', '#0000ff', '6', -2.0000, -6.9282);
    builder.addPermutation('#ff0000', [[0, 4, 8], [1, 5, 6], [2, 3, 7]]);
    builder.addPermutation('#ffff00', [[6, 9, 13], [7, 11, 12], [8, 10, 14]]);
    builder.addPermutation('#00ff00', [[12, 15, 19], [13, 17, 18], [14, 16, 20]]);
    builder.addPermutation('#0000ff', [[18, 21, 25], [19, 23, 24], [20, 22, 26]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABU');

    builder.addHarder('ACF');

    builder.addLocalMap('<image src="images/map_ACE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABU" alt="ABU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ACE" alt="ACE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACF" alt="ACF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHI.puz
function AHI()
{
    var builder = new PuzzleBuilder('AHI');

    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addPermutation('#0000ff', [[7, 4]]);
    builder.addPermutation('#ff00ff', [[1, 6]]);
    builder.addPermutation('#00ff00', [[2, 0], [8, 5]]);
    builder.addPermutation('#ffff00', [[6, 7], [4, 3], [5, 1]]);
    builder.addPermutation('#ff0000', [[0, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHJ');

    builder.addHarder('AFT');
    builder.addHarder('AHL');

    builder.addLocalMap('<image src="images/map_AHI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AFT" alt="AFT">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHI" alt="AHI">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AHJ" alt="AHJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHL" alt="AHL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABE.puz
function ABE()
{
    var builder = new PuzzleBuilder('ABE');

    builder.addNode('p0', '#ff0000', '13', 0.8660, 0.5000);
    builder.addNode('p1', '#ffff00', '0', -0.8660, 0.5000);
    builder.addNode('p2', '#00ff00', '22', -0.0000, -1.0000);
    builder.addNode('p3', '#00ffff', '17', 0.0000, 2.0000);
    builder.addNode('p4', '#0000ff', '6', -1.7321, -1.0000);
    builder.addNode('p5', '#7f007f', '8', 1.7321, -1.0000);
    builder.addPermutation('#ff0000', [[0, 2, 5]]);
    builder.addPermutation('#00ff00', [[1, 4, 2]]);
    builder.addPermutation('#0000ff', [[0, 3, 1]]);
    builder.addPermutation('#7f007f', [[3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'p0', 0.999977999758, true, false, true);
    builder.addCircleArc('#ff0000', 'p2', 0.999977999758, true, false, false);
    builder.addCircleArc('#ff0000', 'p5', 0.999977999758, true, false, false);
    builder.addCircleArc('#00ff00', 'p1', 0.999977999758, true, false, true);
    builder.addCircleArc('#00ff00', 'p4', 0.999977999758, true, false, false);
    builder.addCircleArc('#00ff00', 'p2', 0.999977999758, true, false, false);
    builder.addCircleArc('#0000ff', 'p0', 0.999977999758, true, false, false);
    builder.addCircleArc('#0000ff', 'p3', 0.999977999758, true, false, true);
    builder.addCircleArc('#0000ff', 'p1', 0.999977999758, true, false, false);
    builder.addCircleArc('#7f007f', 'p3', 2.0, true, false, true);
    builder.addCircleArc('#7f007f', 'p4', 2.0, true, false, false);
    builder.addCircleArc('#7f007f', 'p5', 2.0, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAM');

    builder.addHarder('ABR');

    builder.addLocalMap('<image src="images/map_ABE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAM" alt="AAM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABE" alt="ABE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABR" alt="ABR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACX.puz
function ACX()
{
    var builder = new PuzzleBuilder('ACX');

    builder.addNode('ul', '#ff0000', '13', 1, 1);
    builder.addNode('ur', '#ffff00', '0', 4, 1);
    builder.addNode('bl', '#0000ff', '6', 1, 4);
    builder.addNode('br', '#00ff00', '22', 4, 4);
    builder.addPermutation('#ff0000', [[0, 2], [1, 3]]);
    builder.addPermutation('#0000ff', [[0, 1]]);
    builder.addPermutation('#00ff00', [[2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACP');

    builder.addHarder('AAE');
    builder.addHarder('ACQ');

    builder.addLocalMap('<image src="images/map_ACX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AAE" alt="AAE">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ACP" alt="ACP">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACQ" alt="ACQ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACX" alt="ACX">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADU.puz
function ADU()
{
    var builder = new PuzzleBuilder('ADU');

    builder.addNode('x0', '#ff0000', '13', 0.0000, 0.0000);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ff0000', '13', -1.5000, -0.8660);
    builder.addNode('y0', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 2.5000, 0.8660);
    builder.addNode('y3', '#0000ff', '6', 3.0000, 0.0000);
    builder.addNode('y4', '#0000ff', '6', 2.5000, -0.8660);
    builder.addNode('y5', '#0000ff', '6', 1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[3, 8, 7, 6, 5, 4]]);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y4', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y5', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAJ');

    builder.addHarder('ADV');

    builder.addLocalMap('<image src="images/map_ADU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAJ" alt="AAJ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ADU" alt="ADU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADV" alt="ADV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFM.puz
function AFM()
{
    var builder = new PuzzleBuilder('AFM');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', -1, 1);
    builder.addNode('p3', '#00ffff', '17', -1, 2);
    builder.addNode('p4', '#0000ff', '6', -1, -1);
    builder.addNode('p5', '#7f007f', '8', -1, -2);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#00ff00', [[2, 3], [4, 5]]);
    builder.addPermutation('#0000ff', [[0, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEY');

    builder.addHarder('AFA');

    builder.addLocalMap('<image src="images/map_AFM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AEY" alt="AEY">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AFA" alt="AFA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFM" alt="AFM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADE.puz
function ADE()
{
    var builder = new PuzzleBuilder('ADE');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 7]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 6]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADC');

    builder.addHarder('ADG');
    builder.addHarder('ADH');
    builder.addHarder('ADI');

    builder.addLocalMap('<image src="images/map_ADE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADC" alt="ADC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADE" alt="ADE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADG" alt="ADG">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFV.puz
function AFV()
{
    var builder = new PuzzleBuilder('AFV');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#0000ff', '6', 1, 2);
    builder.addNode('p21', '#0000ff', '6', 2, 1);
    builder.addNode('p22', '#7f007f', '8', 2, 2);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [6, 7]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [2, 5]]);
    builder.addPermutation('#0000ff', [[4, 6], [5, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFS');
    builder.addEasier('AFW');

    builder.addHarder('AGV');

    builder.addLocalMap('<image src="images/map_AFV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AFS" alt="AFS">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFV" alt="AFV">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AFW" alt="AFW">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AGV" alt="AGV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABD.puz
function ABD()
{
    var builder = new PuzzleBuilder('ABD');

    builder.addNode('r1c2', '#ff0000', '13', 3, 1);
    builder.addNode('r1c4', '#ff0000', '13', 7, 1);
    builder.addNode('r1c6', '#00ff00', '22', 11, 1);
    builder.addNode('r1c8', '#00ff00', '22', 15, 1);
    builder.addNode('r2c1', '#ff0000', '13', 1, 4);
    builder.addNode('r2c5', '#7f007f', '8', 9, 4);
    builder.addNode('r2c9', '#00ff00', '22', 17, 4);
    builder.addNode('r3c2', '#ff0000', '13', 3, 7);
    builder.addNode('r3c4', '#7f007f', '8', 7, 7);
    builder.addNode('r3c6', '#7f007f', '8', 11, 7);
    builder.addNode('r3c8', '#00ff00', '22', 15, 7);
    builder.addNode('r4c3', '#0000ff', '6', 5, 10);
    builder.addNode('r4c7', '#0000ff', '6', 13, 10);
    builder.addNode('r5c4', '#0000ff', '6', 7, 13);
    builder.addNode('r5c6', '#0000ff', '6', 11, 13);
    builder.addPermutation('#ff0000', [[7, 4, 0, 1, 5, 8]]);
    builder.addPermutation('#00ff00', [[2, 3, 6, 10, 9, 5]]);
    builder.addPermutation('#0000ff', [[12, 14, 13, 11, 8, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADW');

    builder.addHarder('ABW');

    builder.addLocalMap('<image src="images/map_ABD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABD" alt="ABD">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABW" alt="ABW">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADW" alt="ADW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACO.puz
function ACO()
{
    var builder = new PuzzleBuilder('ACO');

    builder.addNode('r0', '#ff0000', '13', -0.0000, -3.5000);
    builder.addNode('r1', '#ff0000', '13', -0.0000, -5.5000);
    builder.addNode('r2', '#ff0000', '13', 1.9021, -4.1180);
    builder.addNode('r3', '#ff0000', '13', 1.1756, -1.8820);
    builder.addNode('r4', '#ff0000', '13', -1.1756, -1.8820);
    builder.addNode('r5', '#ff0000', '13', -1.9021, -4.1180);
    builder.addNode('r6', '#ff0000', '13', -0.0000, -1.8820);
    builder.addNode('r7', '#ff0000', '13', -1.5388, -3.0000);
    builder.addNode('r8', '#ff0000', '13', -0.9511, -4.8090);
    builder.addNode('r9', '#ff0000', '13', 0.9511, -4.8090);
    builder.addNode('r10', '#ff0000', '13', 1.5388, -3.0000);
    builder.addNode('y0', '#ffff00', '0', 0.0000, 3.5000);
    builder.addNode('y1', '#ffff00', '0', 0.0000, 5.5000);
    builder.addNode('y2', '#ffff00', '0', -1.9021, 4.1180);
    builder.addNode('y3', '#ffff00', '0', -1.1756, 1.8820);
    builder.addNode('y4', '#ffff00', '0', 1.1756, 1.8820);
    builder.addNode('y5', '#ffff00', '0', 1.9021, 4.1180);
    builder.addNode('y6', '#ffff00', '0', -0.0000, 1.8820);
    builder.addNode('y7', '#ffff00', '0', 1.5388, 3.0000);
    builder.addNode('y8', '#ffff00', '0', 0.9511, 4.8090);
    builder.addNode('y9', '#ffff00', '0', -0.9511, 4.8090);
    builder.addNode('y10', '#ffff00', '0', -1.5388, 3.0000);
    builder.addNode('g0', '#00ff00', '22', 9.0933, 0.0000);
    builder.addNode('g2', '#00ff00', '22', 9.7113, 1.9021);
    builder.addNode('g3', '#00ff00', '22', 7.4752, 1.1756);
    builder.addNode('g4', '#00ff00', '22', 7.4752, -1.1756);
    builder.addNode('g5', '#00ff00', '22', 9.7113, -1.9021);
    builder.addNode('g6', '#00ff00', '22', 7.4752, 0.0000);
    builder.addNode('g7', '#00ff00', '22', 8.5933, -1.5388);
    builder.addNode('g10', '#00ff00', '22', 8.5933, 1.5388);
    builder.addNode('b0', '#0000ff', '6', -9.0933, 0.0000);
    builder.addNode('b2', '#0000ff', '6', -9.7113, -1.9021);
    builder.addNode('b3', '#0000ff', '6', -7.4752, -1.1756);
    builder.addNode('b4', '#0000ff', '6', -7.4752, 1.1756);
    builder.addNode('b5', '#0000ff', '6', -9.7113, 1.9021);
    builder.addNode('b6', '#0000ff', '6', -7.4752, 0.0000);
    builder.addNode('b7', '#0000ff', '6', -8.5933, 1.5388);
    builder.addNode('b10', '#0000ff', '6', -8.5933, -1.5388);
    builder.addPermutation('#00ff00', [[0, 22, 11], [1, 23, 14], [2, 24, 15], [3, 25, 16], [4, 26, 12], [6, 28, 19], [9, 29, 17], [10, 27, 18]]);
    builder.addPermutation('#0000ff', [[0, 11, 30], [1, 15, 34], [3, 12, 31], [4, 13, 32], [5, 14, 33], [6, 20, 37], [7, 21, 35], [8, 17, 36]]);
    builder.addCircleArc('#00ff00', 'r0', 5.22022285034, true, false, false);
    builder.addCircleArc('#00ff00', 'g0', 5.22022285034, true, false, false);
    builder.addCircleArc('#00ff00', 'y0', 5.22022285034, true, false, true);
    builder.addCircleArc('#00ff00', 'r1', 6.18046253936, true, false, false);
    builder.addCircleArc('#00ff00', 'g2', 6.18046253936, true, false, false);
    builder.addCircleArc('#00ff00', 'y3', 6.18046253936, true, false, true);
    builder.addCircleArc('#00ff00', 'r2', 3.94918312771, true, false, false);
    builder.addCircleArc('#00ff00', 'g3', 3.94918312771, true, false, false);
    builder.addCircleArc('#00ff00', 'y4', 3.94918312771, true, false, true);
    builder.addCircleArc('#00ff00', 'r3', 3.94918312771, true, false, false);
    builder.addCircleArc('#00ff00', 'g4', 3.94918312771, true, false, false);
    builder.addCircleArc('#00ff00', 'y5', 3.94918312771, true, false, true);
    builder.addCircleArc('#00ff00', 'r4', 6.18046253936, true, false, false);
    builder.addCircleArc('#00ff00', 'g5', 6.18046253936, true, false, false);
    builder.addCircleArc('#00ff00', 'y1', 6.18046253936, true, false, true);
    builder.addCircleArc('#00ff00', 'r6', 5.04993939566, true, false, false);
    builder.addCircleArc('#00ff00', 'g7', 5.04993939566, true, false, false);
    builder.addCircleArc('#00ff00', 'y8', 5.04993939566, true, false, true);
    builder.addCircleArc('#00ff00', 'r9', 5.04993939566, true, false, false);
    builder.addCircleArc('#00ff00', 'g10', 5.04993939566, true, false, false);
    builder.addCircleArc('#00ff00', 'y6', 5.04993939566, true, false, true);
    builder.addCircleArc('#00ff00', 'r10', 3.72623517283, true, false, false);
    builder.addCircleArc('#00ff00', 'g6', 3.72623517283, true, false, false);
    builder.addCircleArc('#00ff00', 'y7', 3.72623517283, true, false, true);
    builder.addCircleArc('#0000ff', 'r0', 5.22022285034, true, false, false);
    builder.addCircleArc('#0000ff', 'y0', 5.22022285034, true, false, true);
    builder.addCircleArc('#0000ff', 'b0', 5.22022285034, true, false, true);
    builder.addCircleArc('#0000ff', 'r1', 6.18046253936, true, false, false);
    builder.addCircleArc('#0000ff', 'y4', 6.18046253936, true, false, false);
    builder.addCircleArc('#0000ff', 'b5', 6.18046253936, true, false, true);
    builder.addCircleArc('#0000ff', 'r3', 6.18046253936, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 6.18046253936, true, false, true);
    builder.addCircleArc('#0000ff', 'b2', 6.18046253936, true, false, false);
    builder.addCircleArc('#0000ff', 'r4', 3.94918312771, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 3.94918312771, true, false, true);
    builder.addCircleArc('#0000ff', 'b3', 3.94918312771, true, false, false);
    builder.addCircleArc('#0000ff', 'r5', 3.94918312771, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 3.94918312771, true, false, false);
    builder.addCircleArc('#0000ff', 'b4', 3.94918312771, true, false, true);
    builder.addCircleArc('#0000ff', 'r6', 5.04993939566, true, false, false);
    builder.addCircleArc('#0000ff', 'y9', 5.04993939566, true, false, true);
    builder.addCircleArc('#0000ff', 'b10', 5.04993939566, true, false, false);
    builder.addCircleArc('#0000ff', 'r7', 3.72623517283, true, false, false);
    builder.addCircleArc('#0000ff', 'y10', 3.72623517283, true, false, true);
    builder.addCircleArc('#0000ff', 'b6', 3.72623517283, true, false, true);
    builder.addCircleArc('#0000ff', 'r8', 5.04993939566, true, false, false);
    builder.addCircleArc('#0000ff', 'y6', 5.04993939566, true, false, false);
    builder.addCircleArc('#0000ff', 'b7', 5.04993939566, true, false, true);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABL');

    builder.addLocalMap('<image src="images/map_ACO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ABL" alt="ABL">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ACO" alt="ACO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGO.puz
function AGO()
{
    var builder = new PuzzleBuilder('AGO');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[5, 6], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 6], [3, 7]]);
    builder.addPermutation('#0000ff', [[4, 8], [5, 9], [6, 10], [7, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGH');

    builder.addLocalMap('<image src="images/map_AGO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGH" alt="AGH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGO" alt="AGO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFA.puz
function AFA()
{
    var builder = new PuzzleBuilder('AFA');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.5000, 0.8660);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', -1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#0000ff', [[0, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEZ');
    builder.addEasier('AFM');

    builder.addLocalMap('<image src="images/map_AFA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AEZ" alt="AEZ">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AFA" alt="AFA">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AFM" alt="AFM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIM.puz
function AIM()
{
    var builder = new PuzzleBuilder('AIM');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p2', '#ff0000', '13', 0.5000, -0.8660);
    builder.addNode('p3', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p4', '#00ff00', '22', 3.0000, 0.0000);
    builder.addNode('p5', '#00ff00', '22', 2.5000, -0.8660);
    builder.addNode('p6', '#0000ff', '6', 4.0000, 0.0000);
    builder.addNode('p7', '#0000ff', '6', 5.0000, 0.0000);
    builder.addNode('p8', '#0000ff', '6', 4.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#ffff00', [[3, 4, 5]]);
    builder.addPermutation('#00ff00', [[6, 7, 8]]);
    builder.addPermutation('#0000ff', [[1, 3], [4, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIL');

    builder.addHarder('AIK');

    builder.addLocalMap('<image src="images/map_AIM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AIK" alt="AIK">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AIL" alt="AIL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AIM" alt="AIM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIJ.puz
function AIJ()
{
    var builder = new PuzzleBuilder('AIJ');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p2', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p3', '#ff0000', '13', 1.5000, -0.8660);
    builder.addNode('p4', '#ff0000', '13', 0.5000, -0.8660);
    builder.addNode('p5', '#00ff00', '22', 0.0000, 1.7321);
    builder.addNode('p6', '#00ff00', '22', 0.5000, 0.8660);
    builder.addNode('p7', '#0000ff', '6', -1.5000, -0.8660);
    builder.addNode('p8', '#0000ff', '6', -1.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 3, 4], [1, 5, 6], [2, 7, 8]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 8], [2, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIL');

    builder.addHarder('AIH');
    builder.addHarder('AIK');

    builder.addLocalMap('<image src="images/map_AIJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AIH" alt="AIH">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AIJ" alt="AIJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AIK" alt="AIK">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AIL" alt="AIL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACT.puz
function ACT()
{
    var builder = new PuzzleBuilder('ACT');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#ff00ff', '4', 0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4]]);
    builder.addPermutation('#ffff00', [[2, 3]]);
    builder.addPermutation('#00ff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[4, 5]]);
    builder.addPermutation('#7f007f', [[5, 0]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACQ');

    builder.addHarder('ACU');
    builder.addHarder('ACV');

    builder.addLocalMap('<image src="images/map_ACT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ACQ" alt="ACQ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACT" alt="ACT">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACU" alt="ACU">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ACV" alt="ACV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIL.puz
function AIL()
{
    var builder = new PuzzleBuilder('AIL');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p2', '#ff0000', '13', 0.5000, -0.8660);
    builder.addNode('p3', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p4', '#00ff00', '22', 3.0000, 0.0000);
    builder.addNode('p5', '#00ff00', '22', 2.5000, -0.8660);
    builder.addNode('p6', '#0000ff', '6', 4.0000, 0.0000);
    builder.addNode('p7', '#0000ff', '6', 5.0000, 0.0000);
    builder.addNode('p8', '#0000ff', '6', 4.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2], [3, 4, 5], [6, 7, 8]]);
    builder.addPermutation('#0000ff', [[1, 3], [4, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEK');

    builder.addHarder('AIJ');
    builder.addHarder('AIM');

    builder.addLocalMap('<image src="images/map_AIL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEK" alt="AEK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AIJ" alt="AIJ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AIL" alt="AIL">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AIM" alt="AIM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAK.puz
function AAK()
{
    var builder = new PuzzleBuilder('AAK');

    builder.addNode('lhs1', '#ff0000', '13', 1, 1);
    builder.addNode('lhs2', '#ff7f00', '10', 1, 4);
    builder.addNode('lhs3', '#ffff00', '0', 1, 7);
    builder.addNode('rhs1', '#00ff00', '22', 4, 1);
    builder.addNode('rhs2', '#00ffff', '17', 4, 4);
    builder.addNode('rhs3', '#0000ff', '6', 4, 7);
    builder.addNode('rhs4', '#ff00ff', '4', 4, 10);
    builder.addNode('rhs5', '#7f007f', '8', 4, 13);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addPermutation('#0000ff', [[0, 1, 2], [3, 4, 5, 6, 7]]);
    builder.addCircleArc('#0000ff', 'lhs3', 6.6, true, false, true);
    builder.addCircleArc('#0000ff', 'rhs5', 11.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAJ');

    builder.addHarder('ABQ');

    builder.addLocalMap('<image src="images/map_AAK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAJ" alt="AAJ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAK" alt="AAK">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABQ" alt="ABQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABL.puz
function ABL()
{
    var builder = new PuzzleBuilder('ABL');

    builder.addNode('C', '#ffff00', '0', 0, 0);
    builder.addNode('c', '#00ff00', '22', 6.0, 0);
    builder.addNode('p11', '#00ffff', '17', 3.0, 0.0);
    builder.addNode('p12', '#ffff00', '0', 2.41666666667, 1.77756075064);
    builder.addNode('p13', '#ffff00', '0', 1.66666666667, 2.49443825785);
    builder.addNode('p21', '#00ff00', '22', 3.58333333333, 1.77756075064);
    builder.addNode('p22', '#00ffff', '17', 3.0, 2.64575131106);
    builder.addNode('p23', '#ffff00', '0', 2.25, 3.30718913883);
    builder.addNode('p31', '#00ff00', '22', 4.33333333333, 2.49443825785);
    builder.addNode('p32', '#00ff00', '22', 3.75, 3.30718913883);
    builder.addNode('p33', '#00ffff', '17', 3.0, 4.0);
    builder.addNode('q12', '#ffff00', '0', 2.41666666667, -1.77756075064);
    builder.addNode('q13', '#ffff00', '0', 1.66666666667, -2.49443825785);
    builder.addNode('q21', '#00ff00', '22', 3.58333333333, -1.77756075064);
    builder.addNode('q22', '#00ffff', '17', 3.0, -2.64575131106);
    builder.addNode('q23', '#ffff00', '0', 2.25, -3.30718913883);
    builder.addNode('q31', '#00ff00', '22', 4.33333333333, -2.49443825785);
    builder.addNode('q32', '#00ff00', '22', 3.75, -3.30718913883);
    builder.addNode('q33', '#00ffff', '17', 3.0, -4.0);
    builder.addPermutation('#ffff00', [[2, 3, 4, 12, 11], [5, 6, 7, 15, 14, 13], [8, 9, 10, 18, 17, 16]]);
    builder.addPermutation('#00ff00', [[2, 5, 8, 16, 13], [3, 6, 9, 17, 14, 11], [4, 7, 10, 18, 15, 12]]);
    builder.addCircleArc('#ffff00', 'p11', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p12', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p13', 3.0, false, false, true);
    builder.addCircleArc('#ffff00', 'q13', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'q12', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p21', 4.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p22', 4.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p23', 4.0, false, false, true);
    builder.addCircleArc('#ffff00', 'q23', 4.0, true, false, false);
    builder.addCircleArc('#ffff00', 'q22', 4.0, true, false, false);
    builder.addCircleArc('#ffff00', 'q21', 4.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p31', 5.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p32', 5.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p33', 5.0, false, false, true);
    builder.addCircleArc('#ffff00', 'q33', 5.0, true, false, false);
    builder.addCircleArc('#ffff00', 'q32', 5.0, true, false, false);
    builder.addCircleArc('#ffff00', 'q31', 5.0, true, false, false);
    builder.addCircleArc('#00ff00', 'p11', 3.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p21', 3.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p31', 3.0, true, false, false);
    builder.addCircleArc('#00ff00', 'q31', 3.0, false, false, false);
    builder.addCircleArc('#00ff00', 'q21', 3.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p22', 4.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p32', 4.0, true, false, false);
    builder.addCircleArc('#00ff00', 'q32', 4.0, false, false, false);
    builder.addCircleArc('#00ff00', 'q22', 4.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p13', 5.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p23', 5.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p33', 5.0, true, false, false);
    builder.addCircleArc('#00ff00', 'q33', 5.0, false, false, false);
    builder.addCircleArc('#00ff00', 'q23', 5.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABK');

    builder.addHarder('ACO');

    builder.addLocalMap('<image src="images/map_ABL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABK" alt="ABK">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABL" alt="ABL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACO" alt="ACO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHC.puz
function AHC()
{
    var builder = new PuzzleBuilder('AHC');

    builder.addNode('p02', '#ff0000', '13', 0, 2);
    builder.addNode('p03', '#ffff00', '0', 0, 3);
    builder.addNode('p11', '#ff0000', '13', 1, 1);
    builder.addNode('p12', '#ffff00', '0', 1, 2);
    builder.addNode('p13', '#00ff00', '22', 1, 3);
    builder.addNode('p14', '#0000ff', '6', 1, 4);
    builder.addNode('p20', '#ff0000', '13', 2, 0);
    builder.addNode('p21', '#ffff00', '0', 2, 1);
    builder.addNode('p22', '#00ff00', '22', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p24', '#7f007f', '8', 2, 4);
    builder.addNode('p30', '#ffff00', '0', 3, 0);
    builder.addNode('p31', '#00ff00', '22', 3, 1);
    builder.addPermutation('#ff0000', [[6, 7], [11, 12], [0, 1], [3, 4]]);
    builder.addPermutation('#ffff00', [[2, 3], [4, 5], [7, 8], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [6, 11], [7, 12]]);
    builder.addPermutation('#0000ff', [[2, 7], [3, 8], [4, 9], [5, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHB');

    builder.addHarder('AHD');

    builder.addLocalMap('<image src="images/map_AHC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AHB" alt="AHB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AHC" alt="AHC">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHD" alt="AHD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEQ.puz
function AEQ()
{
    var builder = new PuzzleBuilder('AEQ');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', 1, 1);
    builder.addNode('p3', '#00ffff', '17', 2, 0);
    builder.addNode('p4', '#0000ff', '6', 1, -1);
    builder.addNode('p5', '#7f007f', '8', 0, -1);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEO');

    builder.addHarder('AEB');
    builder.addHarder('AEC');

    builder.addLocalMap('<image src="images/map_AEQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEB" alt="AEB">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AEC" alt="AEC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEO" alt="AEO">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEQ" alt="AEQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACW.puz
function ACW()
{
    var builder = new PuzzleBuilder('ACW');

    builder.addNode('p0', '#000000', '9', 0, 0);
    builder.addNode('p1', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p4', '#ff00ff', '4', 1.5000, -0.8660);
    builder.addNode('p5', '#ff00ff', '4', 1.0000, -1.7321);
    builder.addNode('p6', '#ff00ff', '4', -0.0000, -1.7321);
    builder.addNode('p7', '#00ffff', '17', -1.5000, -0.8660);
    builder.addNode('p8', '#00ffff', '17', -2.0000, -0.0000);
    builder.addNode('p9', '#00ffff', '17', -1.5000, 0.8660);
    builder.addNode('p10', '#ffff00', '0', 0.0000, 1.7321);
    builder.addNode('p11', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p12', '#ffff00', '0', 1.5000, 0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [2, 9], [5, 6], [3, 7], [10, 11]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 4], [3, 6], [7, 8], [11, 12]]);
    builder.addPermutation('#0000ff', [[0, 3], [1, 12], [2, 10], [4, 5], [8, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABT');
    builder.addEasier('ACZ');
    builder.addEasier('ADH');

    builder.addHarder('ACM');

    builder.addLocalMap('<image src="images/map_ACW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=ABT" alt="ABT">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACM" alt="ACM">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ACW" alt="ACW">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ACZ" alt="ACZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAY.puz
function AAY()
{
    var builder = new PuzzleBuilder('AAY');

    builder.addNode('oul', '#ff0000', '13', 4, 1);
    builder.addNode('our', '#ff7f00', '10', 12, 1);
    builder.addNode('oml', '#ffff00', '0', 1, 9);
    builder.addNode('omr', '#ff00ff', '4', 15, 9);
    builder.addNode('obt', '#7f0000', '16', 8, 13);
    builder.addNode('iul', '#00ffff', '17', 6, 4);
    builder.addNode('iur', '#0000ff', '6', 10, 4);
    builder.addNode('iml', '#00ff00', '22', 4, 7);
    builder.addNode('imr', '#007f00', '19', 12, 7);
    builder.addNode('ibt', '#7f007f', '8', 8, 10);
    builder.addPermutation('#ff0000', [[4, 2, 0, 1, 3]]);
    builder.addPermutation('#00ff00', [[9, 4], [7, 2], [5, 0], [6, 1], [8, 3]]);
    builder.addPermutation('#0000ff', [[9, 6, 7, 8, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAU');

    builder.addLocalMap('<image src="images/map_AAY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AAU" alt="AAU">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AAY" alt="AAY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAQ.puz
function AAQ()
{
    var builder = new PuzzleBuilder('AAQ');

    builder.addNode('p0', '#ff0000', '13', 0.8660, 0.5000);
    builder.addNode('p1', '#ffff00', '0', -0.8660, 0.5000);
    builder.addNode('p2', '#00ff00', '22', -0.0000, -1.0000);
    builder.addNode('p3', '#00ffff', '17', 0.0000, 2.0000);
    builder.addNode('p4', '#0000ff', '6', -1.7321, -1.0000);
    builder.addNode('p5', '#7f007f', '8', 1.7321, -1.0000);
    builder.addPermutation('#ff0000', [[0, 1, 4, 5]]);
    builder.addPermutation('#00ff00', [[0, 3, 4, 2]]);
    builder.addPermutation('#0000ff', [[1, 2, 5, 3]]);
    builder.addCircleArc('#ff0000', 'p0', 0.999977999758, true, false, false);
    builder.addCircleArc('#ff0000', 'p4', 2.0, true, false, false);
    builder.addCircleArc('#00ff00', 'p2', 0.999977999758, true, false, false);
    builder.addCircleArc('#00ff00', 'p3', 2.0, true, false, true);
    builder.addCircleArc('#0000ff', 'p1', 0.999977999758, true, false, true);
    builder.addCircleArc('#0000ff', 'p5', 2.0, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAM');

    builder.addHarder('ABR');

    builder.addLocalMap('<image src="images/map_AAQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAM" alt="AAM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAQ" alt="AAQ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABR" alt="ABR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFW.puz
function AFW()
{
    var builder = new PuzzleBuilder('AFW');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#0000ff', '6', 1, 2);
    builder.addNode('p21', '#0000ff', '6', 2, 1);
    builder.addNode('p22', '#7f007f', '8', 2, 2);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#ffff00', [[3, 4], [5, 6]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3]]);
    builder.addPermutation('#0000ff', [[3, 5], [4, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHG');

    builder.addHarder('AFV');
    builder.addHarder('AFX');
    builder.addHarder('AFZ');

    builder.addLocalMap('<image src="images/map_AFW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AFV" alt="AFV">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AFW" alt="AFW">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFX" alt="AFX">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AFZ" alt="AFZ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHG" alt="AHG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFH.puz
function AFH()
{
    var builder = new PuzzleBuilder('AFH');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 1);
    builder.addNode('p2', '#00ff00', '22', 0, 1);
    builder.addNode('p3', '#00ffff', '17', -1, 1);
    builder.addNode('p4', '#0000ff', '6', -1, 0);
    builder.addNode('p5', '#7f007f', '8', 0, -1);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#0000ff', [[0, 4], [2, 3]]);
    builder.addPermutation('#7f007f', [[4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEY');

    builder.addHarder('AFB');
    builder.addHarder('AFC');

    builder.addLocalMap('<image src="images/map_AFH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEY" alt="AEY">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AFB" alt="AFB">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFC" alt="AFC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFH" alt="AFH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHD.puz
function AHD()
{
    var builder = new PuzzleBuilder('AHD');

    builder.addNode('p03', '#ffff00', '0', 0, 3);
    builder.addNode('p04', '#00ff00', '22', 0, 4);
    builder.addNode('p12', '#ffff00', '0', 1, 2);
    builder.addNode('p13', '#00ff00', '22', 1, 3);
    builder.addNode('p14', '#0000ff', '6', 1, 4);
    builder.addNode('p20', '#ff0000', '13', 2, 0);
    builder.addNode('p21', '#ffff00', '0', 2, 1);
    builder.addNode('p22', '#00ff00', '22', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p30', '#ffff00', '0', 3, 0);
    builder.addNode('p31', '#00ff00', '22', 3, 1);
    builder.addNode('p32', '#0000ff', '6', 3, 2);
    builder.addPermutation('#ff0000', [[2, 3], [5, 6], [7, 8], [9, 10]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [6, 7], [10, 11]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [5, 9], [6, 10], [7, 11]]);
    builder.addPermutation('#0000ff', [[2, 7], [3, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHC');

    builder.addHarder('ABF');
    builder.addHarder('AHE');

    builder.addLocalMap('<image src="images/map_AHD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABF" alt="ABF">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AHC" alt="AHC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHD" alt="AHD">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHE" alt="AHE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADY.puz
function ADY()
{
    var builder = new PuzzleBuilder('ADY');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', 1, 1);
    builder.addNode('p3', '#0000ff', '6', 2, 1);
    builder.addNode('p4', '#7f007f', '8', 2, 2);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEN');

    builder.addHarder('AEC');
    builder.addHarder('AEG');

    builder.addLocalMap('<image src="images/map_ADY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADY" alt="ADY">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AEC" alt="AEC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEG" alt="AEG">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEN" alt="AEN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADB.puz
function ADB()
{
    var builder = new PuzzleBuilder('ADB');

    builder.addNode('ul', '#ff0000', '13', 0, 0);
    builder.addNode('ur', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('bl', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('br', '#00ff00', '22', 1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 2]]);
    builder.addPermutation('#00ff00', [[1, 3]]);
    builder.addPermutation('#0000ff', [[0, 1]]);
    builder.addCircleArc('#ff0000', 'ul', 1.0, false, true, true);
    builder.addCircleArc('#ff0000', 'bl', 1.0, false, false, false);
    builder.addCircleArc('#00ff00', 'ur', 1.0, false, false, false);
    builder.addCircleArc('#00ff00', 'br', 1.0, false, true, true);
    builder.addCircleArc('#0000ff', 'ul', 1.0, false, false, false);
    builder.addCircleArc('#0000ff', 'ur', 1.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAB');

    builder.addHarder('AAD');
    builder.addHarder('AAS');
    builder.addHarder('ACP');
    builder.addHarder('AFE');

    builder.addLocalMap('<image src="images/map_ADB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=AAB" alt="AAB">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=ACP" alt="ACP">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=ADB" alt="ADB">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AFE" alt="AFE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADP.puz
function ADP()
{
    var builder = new PuzzleBuilder('ADP');

    builder.addNode('x0', '#ff0000', '13', 0.0000, 0.0000);
    builder.addNode('x1', '#ff0000', '13', -1.0000, 1.0000);
    builder.addNode('x2', '#ff0000', '13', -2.0000, 0.0000);
    builder.addNode('x3', '#ff0000', '13', -1.0000, -1.0000);
    builder.addNode('y0', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('y1', '#0000ff', '6', 2.0000, 1.0000);
    builder.addNode('y2', '#0000ff', '6', 3.0000, 0.0000);
    builder.addNode('y3', '#0000ff', '6', 2.0000, -1.0000);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3]]);
    builder.addPermutation('#0000ff', [[4, 7, 6, 5]]);
    builder.addPermutation('#00ff00', [[0, 4]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y0', 1, true, false, true);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEK');

    builder.addHarder('ACN');
    builder.addHarder('ADV');

    builder.addLocalMap('<image src="images/map_ADP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACN" alt="ACN">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADP" alt="ADP">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ADV" alt="ADV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEK" alt="AEK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEW.puz
function AEW()
{
    var builder = new PuzzleBuilder('AEW');

    builder.addNode('lhs', '#ff0000', '13', 1, 7);
    builder.addNode('mid', '#ffff00', '0', 4, 7);
    builder.addNode('rhs', '#0000ff', '6', 7, 4);
    builder.addNode('top', '#7f007f', '8', 7, 1);
    builder.addNode('bot', '#00ff00', '22', 7, 10);
    builder.addNode('six', '#00ffff', '17', 4, 1);
    builder.addPermutation('#ff0000', [[0, 1], [5, 3]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFD');

    builder.addHarder('AEU');

    builder.addLocalMap('<image src="images/map_AEW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AEU" alt="AEU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AEW" alt="AEW">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFD" alt="AFD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABP.puz
function ABP()
{
    var builder = new PuzzleBuilder('ABP');

    builder.addNode('p1', '#ff0000', '13', -6.0000, -0.0000);
    builder.addNode('p2', '#0000ff', '6', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', '13', -3.0000, -0.0000);
    builder.addNode('p4', '#0000ff', '6', -1.5000, 2.5981);
    builder.addNode('p5', '#ff0000', '13', 0.0000, 0.0000);
    builder.addNode('p6', '#0000ff', '6', 1.5000, 2.5981);
    builder.addNode('p7', '#ff0000', '13', 3.0000, 0.0000);
    builder.addNode('p8', '#0000ff', '6', 4.5000, 2.5981);
    builder.addNode('p9', '#ff0000', '13', 6.0000, 0.0000);
    builder.addNode('p10', '#ffff00', '0', 0.0000, 5.1962);
    builder.addNode('p11', '#00ffff', '17', -0.0000, -3.4641);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4], [5, 6], [7, 8]]);
    builder.addPermutation('#ffff00', [[9, 7, 5, 3, 1]]);
    builder.addPermutation('#00ffff', [[0, 2, 4, 6, 8, 10]]);
    builder.addCircleArc('#ffff00', 'p2', 5.19615242271, false, false, false);
    builder.addCircleArc('#ffff00', 'p10', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ffff', 'p9', 6.92820323028, false, false, false);
    builder.addCircleArc('#00ffff', 'p11', 6.92820323028, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEG');
    builder.addEasier('AEK');

    builder.addHarder('ABQ');

    builder.addLocalMap('<image src="images/map_ABP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABP" alt="ABP">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ABQ" alt="ABQ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEG" alt="AEG">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AEK" alt="AEK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADI.puz
function ADI()
{
    var builder = new PuzzleBuilder('ADI');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p9', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 8]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6], [3, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADD');
    builder.addEasier('ADE');
    builder.addEasier('ADF');

    builder.addHarder('ADJ');
    builder.addHarder('ADK');
    builder.addHarder('AED');

    builder.addLocalMap('<image src="images/map_ADI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADD" alt="ADD">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=ADE" alt="ADE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADF" alt="ADF">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADJ" alt="ADJ">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ADK" alt="ADK">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AED" alt="AED">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADA.puz
function ADA()
{
    var builder = new PuzzleBuilder('ADA');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p2', '#0000ff', '6', -0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addCircleArc('#ff0000', 'p0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'p1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'p2', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAA');

    builder.addHarder('AAF');
    builder.addHarder('ABA');
    builder.addHarder('AEF');

    builder.addLocalMap('<image src="images/map_ADA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AAA" alt="AAA">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAF" alt="AAF">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABA" alt="ABA">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADA" alt="ADA">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AEF" alt="AEF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AER.puz
function AER()
{
    var builder = new PuzzleBuilder('AER');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', 1, 1);
    builder.addNode('p3', '#00ffff', '17', 0, 1);
    builder.addNode('p4', '#0000ff', '6', -1, 0);
    builder.addNode('p5', '#7f007f', '8', 0, -1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[3, 4]]);
    builder.addPermutation('#0000ff', [[4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEO');

    builder.addHarder('AEC');
    builder.addHarder('AES');
    builder.addHarder('AFL');

    builder.addLocalMap('<image src="images/map_AER.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEC" alt="AEC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEO" alt="AEO">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AER" alt="AER">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AES" alt="AES">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AFL" alt="AFL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEK.puz
function AEK()
{
    var builder = new PuzzleBuilder('AEK');

    builder.addNode('x0', '#ff0000', '13', 0.0000, 0.0000);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ff0000', '13', -1.5000, -0.8660);
    builder.addNode('y0', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('y1', '#0000ff', '6', 2.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 2.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[3, 5, 4]]);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADN');

    builder.addHarder('AAJ');
    builder.addHarder('ABP');
    builder.addHarder('ADP');
    builder.addHarder('AIL');

    builder.addLocalMap('<image src="images/map_AEK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AAJ" alt="AAJ">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=ABP" alt="ABP">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=ADP" alt="ADP">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AEK" alt="AEK">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AIL" alt="AIL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADO.puz
function ADO()
{
    var builder = new PuzzleBuilder('ADO');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ff0000', '13', -1.5000, -0.8660);
    builder.addNode('y1', '#0000ff', '6', 1.0000, 1.0000);
    builder.addNode('y2', '#0000ff', '6', 2.0000, 0.0000);
    builder.addNode('y3', '#0000ff', '6', 1.0000, -1.0000);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[0, 5, 4, 3]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADN');

    builder.addHarder('ADQ');

    builder.addLocalMap('<image src="images/map_ADO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ADO" alt="ADO">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADQ" alt="ADQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABC.puz
function ABC()
{
    var builder = new PuzzleBuilder('ABC');

    builder.addNode('r1c2', '#ff0000', '13', 4, 1);
    builder.addNode('r1c5', '#ffff00', '0', 13, 1);
    builder.addNode('r2c1', '#ff0000', '13', 1, 4);
    builder.addNode('r2c2', '#ff0000', '13', 4, 4);
    builder.addNode('r2c5', '#ffff00', '0', 13, 4);
    builder.addNode('r2c6', '#ffff00', '0', 16, 4);
    builder.addNode('r3c3', '#7f007f', '8', 7, 7);
    builder.addNode('r3c4', '#7f007f', '8', 10, 7);
    builder.addNode('r4c3', '#7f007f', '8', 7, 10);
    builder.addNode('r4c4', '#7f007f', '8', 10, 10);
    builder.addNode('r5c1', '#0000ff', '6', 1, 13);
    builder.addNode('r5c2', '#0000ff', '6', 4, 13);
    builder.addNode('r5c5', '#00ff00', '22', 13, 13);
    builder.addNode('r5c6', '#00ff00', '22', 16, 13);
    builder.addNode('r6c2', '#0000ff', '6', 4, 16);
    builder.addNode('r6c5', '#00ff00', '22', 13, 16);
    builder.addPermutation('#ff0000', [[3, 4, 7, 6], [11, 8, 9, 12]]);
    builder.addPermutation('#ffff00', [[3, 2, 0], [12, 13, 15]]);
    builder.addPermutation('#00ff00', [[4, 1, 5], [11, 14, 10]]);
    builder.addPermutation('#0000ff', [[3, 6, 8, 11], [4, 7, 9, 12]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAV');
    builder.addEasier('AHW');

    builder.addHarder('ABG');

    builder.addLocalMap('<image src="images/map_ABC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AAV" alt="AAV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABC" alt="ABC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ABG" alt="ABG">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHW" alt="AHW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHV.puz
function AHV()
{
    var builder = new PuzzleBuilder('AHV');

    builder.addNode('q__8_9', '#ffff00', '0', -8, 9);
    builder.addNode('q__7_4', '#00ffff', '17', -7, 4);
    builder.addNode('q__3__1', '#00ff00', '22', -3, -1);
    builder.addNode('q__6_3', '#00ffff', '17', -6, 3);
    builder.addNode('q__9_2', '#7f007f', '8', -9, 2);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q__4_2', '#0000ff', '6', -4, 2);
    builder.addNode('q__5_10', '#7f007f', '8', -5, 10);
    builder.addNode('q__6__2', '#0000ff', '6', -6, -2);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q__3_3', '#ff0000', '13', -3, 3);
    builder.addNode('q__8_1', '#7f007f', '8', -8, 1);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__10_3', '#7f007f', '8', -10, 3);
    builder.addNode('q__9__1', '#00ff00', '22', -9, -1);
    builder.addNode('q__5_1', '#00ff00', '22', -5, 1);
    builder.addNode('q__5__5', '#00ff00', '22', -5, -5);
    builder.addNode('q__6_9', '#00ffff', '17', -6, 9);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q__5_4', '#7f007f', '8', -5, 4);
    builder.addNode('q__6_4', '#0000ff', '6', -6, 4);
    builder.addNode('q__5__2', '#7f007f', '8', -5, -2);
    builder.addNode('q__9_1', '#0000ff', '6', -9, 1);
    builder.addNode('q__4_7', '#00ffff', '17', -4, 7);
    builder.addNode('q__5_9', '#0000ff', '6', -5, 9);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q__7_10', '#00ffff', '17', -7, 10);
    builder.addNode('q__8__1', '#00ffff', '17', -8, -1);
    builder.addNode('q__5__1', '#ff0000', '13', -5, -1);
    builder.addNode('q__6_1', '#ffff00', '0', -6, 1);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__6__4', '#00ff00', '22', -6, -4);
    builder.addNode('q__9_9', '#ff0000', '13', -9, 9);
    builder.addNode('q__8_3', '#ffff00', '0', -8, 3);
    builder.addNode('q__8_8', '#ff0000', '13', -8, 8);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q__6_10', '#0000ff', '6', -6, 10);
    builder.addNode('q__7_2', '#ffff00', '0', -7, 2);
    builder.addNode('q__10_1', '#00ffff', '17', -10, 1);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__5_3', '#0000ff', '6', -5, 3);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q__4_4', '#ff0000', '13', -4, 4);
    builder.addNode('q__7_5', '#0000ff', '6', -7, 5);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5_6', '#ffff00', '0', -5, 6);
    builder.addNode('q__6_2', '#00ff00', '22', -6, 2);
    builder.addNode('q__9_3', '#ff0000', '13', -9, 3);
    builder.addNode('q__6__1', '#7f007f', '8', -6, -1);
    builder.addNode('q__3_4', '#ffff00', '0', -3, 4);
    builder.addNode('q__8_0', '#0000ff', '6', -8, 0);
    builder.addNode('q__10_2', '#0000ff', '6', -10, 2);
    builder.addNode('q__8_5', '#00ffff', '17', -8, 5);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q__6_8', '#00ff00', '22', -6, 8);
    builder.addNode('q__5_5', '#ff0000', '13', -5, 5);
    builder.addNode('q__6_7', '#ffff00', '0', -6, 7);
    builder.addNode('q__4_8', '#0000ff', '6', -4, 8);
    builder.addNode('q__4_6', '#00ff00', '22', -4, 6);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__3_7', '#0000ff', '6', -3, 7);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__3_8', '#7f007f', '8', -3, 8);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__4_3', '#7f007f', '8', -4, 3);
    builder.addNode('q__8_10', '#00ff00', '22', -8, 10);
    builder.addNode('q__8_2', '#ff0000', '13', -8, 2);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q__7_3', '#00ff00', '22', -7, 3);
    builder.addNode('q__10_0', '#00ff00', '22', -10, 0);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addNode('q__5_0', '#ffff00', '0', -5, 0);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__5_7', '#00ff00', '22', -5, 7);
    builder.addNode('q__6_5', '#7f007f', '8', -6, 5);
    builder.addNode('q__9_0', '#00ffff', '17', -9, 0);
    builder.addNode('q__4_0', '#00ff00', '22', -4, 0);
    builder.addNode('q__5_8', '#00ffff', '17', -5, 8);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q__7_9', '#00ff00', '22', -7, 9);
    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q__4__1', '#ffff00', '0', -4, -1);
    builder.addNode('q__6__3', '#00ffff', '17', -6, -3);
    builder.addNode('q__9_8', '#7f007f', '8', -9, 8);
    builder.addNode('q__3_0', '#00ffff', '17', -3, 0);
    builder.addNode('q__8_4', '#00ff00', '22', -8, 4);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__7_1', '#ff0000', '13', -7, 1);
    builder.addNode('q__4__5', '#00ffff', '17', -4, -5);
    builder.addNode('q__6_0', '#ff0000', '13', -6, 0);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q__5_2', '#00ffff', '17', -5, 2);
    builder.addNode('q__6_6', '#ff0000', '13', -6, 6);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addPermutation('#0000ff', [[55, 31], [41, 19], [86, 26], [42, 21], [69, 0], [60, 23], [24, 7], [25, 85], [20, 3], [44, 68], [63, 18], [77, 43], [80, 47], [9, 61], [37, 17], [73, 1], [22, 82], [99, 58], [71, 36], [5, 30], [10, 51], [74, 39], [96, 29], [72, 12], [46, 40]]);
    builder.addPermutation('#ffff00', [[1, 92], [98, 6], [68, 41], [12, 9], [100, 67], [54, 45], [34, 73], [47, 60], [78, 65], [31, 71], [30, 42], [26, 69], [21, 5], [95, 16], [61, 72], [36, 55], [88, 28], [23, 80], [38, 70], [93, 97], [85, 64]]);
    builder.addPermutation('#00ff00', [[66, 59], [13, 49], [38, 48], [23, 62], [3, 73], [39, 22], [18, 5], [51, 44], [29, 94], [93, 75], [82, 74], [79, 87], [40, 55], [68, 10], [4, 53], [1, 20], [17, 86], [91, 83], [88, 2]]);
    builder.addPermutation('#00ffff', [[42, 100], [2, 91], [55, 93], [83, 88], [6, 68], [70, 34], [53, 13], [32, 89], [64, 78], [14, 82], [49, 4], [57, 47], [33, 90], [73, 38], [48, 3], [52, 27], [56, 17], [97, 36], [28, 76], [41, 98]]);
    builder.addPermutation('#ff00ff', [[92, 54], [8, 50], [28, 21], [20, 81], [59, 23], [65, 12], [22, 4], [67, 95], [87, 93], [48, 29], [80, 84], [62, 66], [70, 11], [75, 79], [16, 100], [45, 1], [15, 98], [94, 38], [5, 88]]);
    builder.addPermutation('#ff0000', [[27, 14], [98, 48], [4, 70], [36, 63], [84, 56], [7, 37], [29, 15], [3, 41], [47, 99], [11, 22], [76, 96], [12, 46], [82, 52], [89, 42], [21, 8], [0, 33], [19, 20], [81, 57], [17, 24], [58, 80], [50, 28], [100, 32], [43, 25], [90, 35]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHS');

    builder.addHarder('AHU');

    builder.addLocalMap('<image src="images/map_AHV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AHS" alt="AHS">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHU" alt="AHU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AHV" alt="AHV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADM.puz
function ADM()
{
    var builder = new PuzzleBuilder('ADM');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p7', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p9', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p11', '#7f007f', '8', 1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [1, 7], [4, 10]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 8], [5, 11]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6], [3, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADL');

    builder.addHarder('ACM');

    builder.addLocalMap('<image src="images/map_ADM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACM" alt="ACM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADL" alt="ADL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ADM" alt="ADM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACI.puz
function ACI()
{
    var builder = new PuzzleBuilder('ACI');

    builder.addNode('p1', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#ffff00', '0', -1.0000, 1.7321);
    builder.addNode('p4', '#00ff00', '22', -2.0000, 0.0000);
    builder.addNode('p5', '#00ffff', '17', -1.0000, -1.7321);
    builder.addNode('p6', '#00ffff', '17', 1.0000, -1.7321);
    builder.addNode('p7', '#00ff00', '22', 5.0000, 0.0000);
    builder.addNode('p8', '#ff7f00', '10', 2.5000, 4.3301);
    builder.addNode('p9', '#ff7f00', '10', -2.5000, 4.3301);
    builder.addNode('p10', '#00ff00', '22', -5.0000, 0.0000);
    builder.addNode('p11', '#0000ff', '6', -2.5000, -4.3301);
    builder.addNode('p12', '#0000ff', '6', 2.5000, -4.3301);
    builder.addNode('p13', '#ffff00', '0', 6.0000, 1.7321);
    builder.addNode('p14', '#ff7f00', '10', 4.5000, 4.3301);
    builder.addNode('p15', '#ff0000', '13', 1.5000, 6.0622);
    builder.addNode('p16', '#ff0000', '13', -1.5000, 6.0622);
    builder.addNode('p17', '#ff7f00', '10', -4.5000, 4.3301);
    builder.addNode('p18', '#ffff00', '0', -6.0000, 1.7321);
    builder.addNode('p19', '#00ffff', '17', -6.0000, -1.7321);
    builder.addNode('p20', '#0000ff', '6', -4.5000, -4.3301);
    builder.addNode('p21', '#7f007f', '8', -1.5000, -6.0622);
    builder.addNode('p22', '#7f007f', '8', 1.5000, -6.0622);
    builder.addNode('p23', '#0000ff', '6', 4.5000, -4.3301);
    builder.addNode('p24', '#00ffff', '17', 6.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 3], [1, 4], [2, 5], [6, 23, 12], [7, 14, 13], [8, 15, 16], [9, 18, 17], [10, 19, 20], [11, 22, 21]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23]]);
    builder.addCircleArc('#0000ff', 'p1', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p4', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p13', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p15', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p16', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p17', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p18', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p19', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p20', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p21', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p22', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p23', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p24', 4.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACG');

    builder.addHarder('ACJ');

    builder.addLocalMap('<image src="images/map_ACI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ACG" alt="ACG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ACI" alt="ACI">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACJ" alt="ACJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACP.puz
function ACP()
{
    var builder = new PuzzleBuilder('ACP');

    builder.addNode('ul', '#ff0000', '13', 1, 1);
    builder.addNode('ur', '#ffff00', '0', 4, 1);
    builder.addNode('bl', '#0000ff', '6', 1, 4);
    builder.addNode('br', '#00ff00', '22', 4, -2);
    builder.addPermutation('#ff0000', [[0, 2], [1, 3]]);
    builder.addPermutation('#0000ff', [[0, 1]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, false, true, false);
    builder.addCircleArc('#ff0000', 'bl', 2.2, false, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, false, false, false);
    builder.addCircleArc('#ff0000', 'br', 2.2, false, true, false);
    builder.addCircleArc('#0000ff', 'ul', 2.2, false, false, false);
    builder.addCircleArc('#0000ff', 'ur', 2.2, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADB');

    builder.addHarder('ACR');
    builder.addHarder('ACX');
    builder.addHarder('AEN');
    builder.addHarder('AFG');

    builder.addLocalMap('<image src="images/map_ACP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=ACP" alt="ACP">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=ACX" alt="ACX">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=ADB" alt="ADB">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AEN" alt="AEN">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AFG" alt="AFG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAV.puz
function AAV()
{
    var builder = new PuzzleBuilder('AAV');

    builder.addNode('ulul', '#ff0000', '13', 1, 1);
    builder.addNode('ulur', '#ff0000', '13', 4, 1);
    builder.addNode('ulbl', '#ff0000', '13', 1, 4);
    builder.addNode('ulbr', '#ff0000', '13', 4, 4);
    builder.addNode('urul', '#ffff00', '0', 10, 1);
    builder.addNode('urur', '#ffff00', '0', 13, 1);
    builder.addNode('urbl', '#ffff00', '0', 10, 4);
    builder.addNode('urbr', '#ffff00', '0', 13, 4);
    builder.addNode('blul', '#00ff00', '22', 1, 10);
    builder.addNode('blur', '#00ff00', '22', 4, 10);
    builder.addNode('blbl', '#00ff00', '22', 1, 13);
    builder.addNode('blbr', '#00ff00', '22', 4, 13);
    builder.addNode('brul', '#0000ff', '6', 10, 10);
    builder.addNode('brur', '#0000ff', '6', 13, 10);
    builder.addNode('brbl', '#0000ff', '6', 10, 13);
    builder.addNode('brbr', '#0000ff', '6', 13, 13);
    builder.addNode('center', '#7f007f', '8', 7, 7);
    builder.addPermutation('#ff0000', [[0, 1, 3, 2], [4, 5, 7, 6]]);
    builder.addPermutation('#ffff00', [[12, 13, 15, 14], [8, 9, 11, 10]]);
    builder.addPermutation('#00ff00', [[3, 16, 6]]);
    builder.addPermutation('#0000ff', [[9, 16, 12]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABH');

    builder.addHarder('ABC');

    builder.addLocalMap('<image src="images/map_AAV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAV" alt="AAV">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABC" alt="ABC">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABH" alt="ABH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGV.puz
function AGV()
{
    var builder = new PuzzleBuilder('AGV');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#00ffff', '17', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p32', '#0000ff', '6', 3, 2);
    builder.addNode('p33', '#7f007f', '8', 3, 3);
    builder.addPermutation('#ff0000', [[2, 3], [5, 6], [7, 8], [9, 10]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [6, 7]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [7, 9], [8, 10]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6], [4, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFV');
    builder.addEasier('AGW');

    builder.addLocalMap('<image src="images/map_AGV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AFV" alt="AFV">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AGV" alt="AGV">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGW" alt="AGW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACJ.puz
function ACJ()
{
    var builder = new PuzzleBuilder('ACJ');

    builder.addNode('p1', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#ffff00', '0', -1.0000, 1.7321);
    builder.addNode('p4', '#00ff00', '22', -2.0000, 0.0000);
    builder.addNode('p5', '#00ffff', '17', -1.0000, -1.7321);
    builder.addNode('p6', '#00ffff', '17', 1.0000, -1.7321);
    builder.addNode('p7', '#00ff00', '22', 5.0000, 0.0000);
    builder.addNode('p8', '#ff7f00', '10', 2.5000, 4.3301);
    builder.addNode('p9', '#ff7f00', '10', -2.5000, 4.3301);
    builder.addNode('p10', '#00ff00', '22', -5.0000, 0.0000);
    builder.addNode('p11', '#0000ff', '6', -2.5000, -4.3301);
    builder.addNode('p12', '#0000ff', '6', 2.5000, -4.3301);
    builder.addNode('p13', '#ffff00', '0', 6.0000, 1.7321);
    builder.addNode('p14', '#ff7f00', '10', 4.5000, 4.3301);
    builder.addNode('p15', '#ff0000', '13', 1.5000, 6.0622);
    builder.addNode('p16', '#ff0000', '13', -1.5000, 6.0622);
    builder.addNode('p17', '#ff7f00', '10', -4.5000, 4.3301);
    builder.addNode('p18', '#ffff00', '0', -6.0000, 1.7321);
    builder.addNode('p19', '#00ffff', '17', -6.0000, -1.7321);
    builder.addNode('p20', '#0000ff', '6', -4.5000, -4.3301);
    builder.addNode('p21', '#7f007f', '8', -1.5000, -6.0622);
    builder.addNode('p22', '#7f007f', '8', 1.5000, -6.0622);
    builder.addNode('p23', '#0000ff', '6', 4.5000, -4.3301);
    builder.addNode('p24', '#00ffff', '17', 6.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 3], [1, 4], [2, 5]]);
    builder.addPermutation('#ffff00', [[6, 23, 12], [9, 18, 17]]);
    builder.addPermutation('#00ff00', [[7, 14, 13], [10, 19, 20]]);
    builder.addPermutation('#7f007f', [[8, 15, 16], [11, 22, 21]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23]]);
    builder.addCircleArc('#0000ff', 'p1', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p4', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p13', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p15', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p16', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p17', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p18', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p19', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p20', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p21', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p22', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p23', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p24', 4.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACH');
    builder.addEasier('ACI');

    builder.addLocalMap('<image src="images/map_ACJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=ACH" alt="ACH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ACI" alt="ACI">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=ACJ" alt="ACJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHP.puz
function AHP()
{
    var builder = new PuzzleBuilder('AHP');

    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addPermutation('#0000ff', [[20, 7], [9, 6], [1, 14], [5, 22], [3, 15], [13, 23], [27, 10], [24, 12], [16, 2]]);
    builder.addPermutation('#ffff00', [[23, 25], [26, 19], [6, 3], [15, 9], [7, 5], [8, 18], [21, 11], [10, 17], [22, 20]]);
    builder.addPermutation('#00ff00', [[4, 0], [2, 13], [12, 5], [21, 28]]);
    builder.addPermutation('#00ffff', [[25, 26], [5, 21], [17, 8], [11, 7]]);
    builder.addPermutation('#ff00ff', [[0, 21], [18, 6], [28, 4]]);
    builder.addPermutation('#ff0000', [[6, 24], [14, 27], [7, 16]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHM');

    builder.addHarder('AHO');
    builder.addHarder('AHS');

    builder.addLocalMap('<image src="images/map_AHP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AHM" alt="AHM">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHO" alt="AHO">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHP" alt="AHP">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHS" alt="AHS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACK.puz
function ACK()
{
    var builder = new PuzzleBuilder('ACK');

    builder.addNode('p1', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p4', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p5', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p6', '#7f007f', '8', 1.0000, -1.7321);
    builder.addNode('p7', '#ff0000', '13', 4.0000, 0.0000);
    builder.addNode('p8', '#ffff00', '0', 2.0000, 3.4641);
    builder.addNode('p9', '#00ff00', '22', -2.0000, 3.4641);
    builder.addNode('p10', '#00ffff', '17', -4.0000, 0.0000);
    builder.addNode('p11', '#0000ff', '6', -2.0000, -3.4641);
    builder.addNode('p12', '#7f007f', '8', 2.0000, -3.4641);
    builder.addPermutation('#ff0000', [[1, 8, 7, 6]]);
    builder.addPermutation('#00ff00', [[5, 6, 11, 10]]);
    builder.addPermutation('#0000ff', [[3, 10, 9, 8]]);
    builder.addPermutation('#ffff00', [[1, 5, 3]]);
    builder.addPermutation('#00ffff', [[0, 2, 4]]);
    builder.addPermutation('#7f007f', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAN');

    builder.addHarder('ACL');

    builder.addLocalMap('<image src="images/map_ACK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAN" alt="AAN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ACK" alt="ACK">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACL" alt="ACL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AII.puz
function AII()
{
    var builder = new PuzzleBuilder('AII');

    builder.addNode('p0', '#00ffff', '17', 1.0000, 0.0000);
    builder.addNode('p1', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('p3', '#0000ff', '6', 3.0000, 0.0000);
    builder.addNode('p4', '#7f007f', '8', 4.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 4.5000, 0.8660);
    builder.addNode('p6', '#ffff00', '0', -1.5000, 2.5981);
    builder.addNode('p7', '#ffff00', '0', -1.5000, 4.3301);
    builder.addNode('p8', '#ff0000', '13', -3.0000, 3.4641);
    builder.addNode('p9', '#ffff00', '0', -1.5000, -2.5981);
    builder.addNode('p10', '#ff0000', '13', -3.0000, -3.4641);
    builder.addNode('p11', '#ffff00', '0', -1.5000, -4.3301);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#ffff00', [[3, 4, 5]]);
    builder.addPermutation('#00ff00', [[6, 7, 8]]);
    builder.addPermutation('#7f007f', [[9, 10, 11]]);
    builder.addPermutation('#0000ff', [[0, 3], [1, 6], [2, 9], [4, 11], [5, 7], [8, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIH');
    builder.addEasier('AIK');

    builder.addHarder('ACH');

    builder.addLocalMap('<image src="images/map_AII.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ACH" alt="ACH">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AIH" alt="AIH">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AII" alt="AII">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AIK" alt="AIK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFY.puz
function AFY()
{
    var builder = new PuzzleBuilder('AFY');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p33', '#ff00ff', '4', 3, 3);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5], [2, 3], [6, 7], [9, 10], [11, 12]]);
    builder.addPermutation('#ffff00', [[5, 6], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 6], [3, 7], [9, 11], [10, 12]]);
    builder.addPermutation('#0000ff', [[5, 8], [6, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGW');

    builder.addHarder('AGB');

    builder.addLocalMap('<image src="images/map_AFY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFY" alt="AFY">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGB" alt="AGB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGW" alt="AGW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHA.puz
function AHA()
{
    var builder = new PuzzleBuilder('AHA');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#00ffff', '17', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p31', '#00ffff', '17', 3, 1);
    builder.addNode('p32', '#0000ff', '6', 3, 2);
    builder.addNode('p33', '#7f007f', '8', 3, 3);
    builder.addPermutation('#ff0000', [[2, 3], [5, 6], [7, 8], [10, 11]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [6, 9], [7, 10], [8, 11]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGZ');

    builder.addHarder('AHB');

    builder.addLocalMap('<image src="images/map_AHA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGZ" alt="AGZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AHA" alt="AHA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHB" alt="AHB">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFN.puz
function AFN()
{
    var builder = new PuzzleBuilder('AFN');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', -0.8090, 0.5878);
    builder.addNode('p2', '#00ff00', '22', -0.8090, -0.5878);
    builder.addNode('p3', '#00ffff', '17', 1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', 1.3090, 0.9511);
    builder.addNode('p5', '#7f007f', '8', 1.3090, -0.9511);
    builder.addPermutation('#ff0000', [[0, 3]]);
    builder.addPermutation('#ffff00', [[0, 1]]);
    builder.addPermutation('#00ff00', [[0, 2]]);
    builder.addPermutation('#0000ff', [[3, 4]]);
    builder.addPermutation('#7f007f', [[3, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAD');

    builder.addHarder('AFO');

    builder.addLocalMap('<image src="images/map_AFN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFN" alt="AFN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AFO" alt="AFO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFB.puz
function AFB()
{
    var builder = new PuzzleBuilder('AFB');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', 0.0000, 1.7321);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', -0.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[0, 4], [2, 3]]);
    builder.addPermutation('#7f007f', [[0, 2], [4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFH');

    builder.addHarder('ADH');

    builder.addLocalMap('<image src="images/map_AFB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFB" alt="AFB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFH" alt="AFH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADL.puz
function ADL()
{
    var builder = new PuzzleBuilder('ADL');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p7', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p11', '#7f007f', '8', 1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [1, 7], [4, 9]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 8], [5, 10]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADJ');
    builder.addEasier('ADK');
    builder.addEasier('AED');

    builder.addHarder('ADM');

    builder.addLocalMap('<image src="images/map_ADL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADJ" alt="ADJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADK" alt="ADK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADL" alt="ADL">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADM" alt="ADM">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=AED" alt="AED">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIG.puz
function AIG()
{
    var builder = new PuzzleBuilder('AIG');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p3', '#00ff00', '22', 1.5000, 0.8660);
    builder.addNode('p4', '#0000ff', '6', 2.0000, 1.7321);
    builder.addNode('p5', '#0000ff', '6', 2.5000, 0.8660);
    builder.addNode('p6', '#7f007f', '8', 3.0000, 1.7321);
    builder.addPermutation('#ff0000', [[0, 1, 2], [3, 4, 5]]);
    builder.addPermutation('#0000ff', [[1, 3, 2], [4, 6, 5]]);
    builder.addCircleArc('#ff0000', 'p0', 0.577346035272, false, true, false);
    builder.addCircleArc('#ff0000', 'p1', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 0.577346035272, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 0.577346035272, false, false, false);
    builder.addCircleArc('#ff0000', 'p5', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p1', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 0.577346035272, false, true, false);
    builder.addCircleArc('#0000ff', 'p4', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 0.577346035272, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 0.577346035272, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAF');
    builder.addEasier('AEL');

    builder.addHarder('ABX');
    builder.addHarder('AIF');

    builder.addLocalMap('<image src="images/map_AIG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AAF" alt="AAF">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEL" alt="AEL">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AIF" alt="AIF">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AIG" alt="AIG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAL.puz
function AAL()
{
    var builder = new PuzzleBuilder('AAL');

    builder.addNode('coord13', '#ff0000', '13', 1, 7);
    builder.addNode('coord22', '#ffff00', '0', 4, 4);
    builder.addNode('coord23', '#00ff00', '22', 4, 7);
    builder.addNode('coord24', '#0000ff', '6', 4, 10);
    builder.addNode('coord31', '#7f007f', '8', 7, 1);
    builder.addNode('coord32', '#00ffff', '17', 7, 4);
    builder.addNode('coord33', '#ed82ed', '3', 7, 7);
    builder.addNode('coord34', '#a42a2a', '14', 7, 10);
    builder.addNode('coord35', '#7f7f7f', '20', 7, 13);
    builder.addNode('coord42', '#7f0000', '16', 10, 4);
    builder.addNode('coord43', '#9931cc', '15', 10, 7);
    builder.addNode('coord44', '#00858a', '5', 10, 10);
    builder.addNode('coord53', '#9acd31', '2', 13, 7);
    builder.addPermutation('#ff0000', [[0, 2], [6, 10]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[2, 6], [10, 12]]);
    builder.addPermutation('#0000ff', [[2, 3], [5, 6], [7, 8], [10, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAP');
    builder.addEasier('AAW');
    builder.addEasier('AFR');

    builder.addLocalMap('<image src="images/map_AAL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,262.5,300.0,362.5" href="index.html?puzzle=AAL" alt="AAL">');
    builder.addLocalMap('<area shape="rect" coords="200.0,12.5,300.0,112.5" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="12.5,12.5,112.5,112.5" href="index.html?puzzle=AAW" alt="AAW">');
    builder.addLocalMap('<area shape="rect" coords="387.5,12.5,487.5,112.5" href="index.html?puzzle=AFR" alt="AFR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHZ.puz
function AHZ()
{
    var builder = new PuzzleBuilder('AHZ');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ff0000', '13', 0.3090, 0.9511);
    builder.addNode('p2', '#ff0000', '13', -0.8090, 0.5878);
    builder.addNode('p3', '#ff0000', '13', -0.8090, -0.5878);
    builder.addNode('p4', '#ff0000', '13', 0.3090, -0.9511);
    builder.addNode('p5', '#ffff00', '0', 2.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', 0.6180, 1.9021);
    builder.addNode('p7', '#ffff00', '0', -1.6180, 1.1756);
    builder.addNode('p8', '#ffff00', '0', -1.6180, -1.1756);
    builder.addNode('p9', '#ffff00', '0', 0.6180, -1.9021);
    builder.addNode('p10', '#00ff00', '22', -3.0000, 0.0000);
    builder.addNode('p11', '#00ff00', '22', -0.9271, -2.8532);
    builder.addNode('p12', '#00ff00', '22', 2.4271, -1.7634);
    builder.addNode('p13', '#00ff00', '22', 2.4271, 1.7634);
    builder.addNode('p14', '#00ff00', '22', -0.9271, 2.8532);
    builder.addNode('p15', '#0000ff', '6', -4.0000, 0.0000);
    builder.addNode('p16', '#0000ff', '6', -1.2361, -3.8042);
    builder.addNode('p17', '#0000ff', '6', 3.2361, -2.3511);
    builder.addNode('p18', '#0000ff', '6', 3.2361, 2.3511);
    builder.addNode('p19', '#0000ff', '6', -1.2361, 3.8042);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [2, 7], [5, 13], [6, 14], [8, 10], [9, 12], [11, 16], [15, 19], [17, 18]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 2], [3, 8], [5, 12], [6, 13], [7, 14], [9, 11], [10, 15], [16, 17], [18, 19]]);
    builder.addPermutation('#0000ff', [[0, 5], [1, 6], [2, 3], [4, 9], [7, 10], [8, 11], [12, 17], [13, 18], [14, 19], [15, 16]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIB');

    builder.addLocalMap('<image src="images/map_AHZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AHZ" alt="AHZ">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AIB" alt="AIB">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABX.puz
function ABX()
{
    var builder = new PuzzleBuilder('ABX');

    builder.addNode('p1', '#7f007f', '8', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', '8', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', '6', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', '6', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', '6', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', '8', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', '6', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', '17', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', '17', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', '17', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', '22', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', '22', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', '0', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', '0', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', '0', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', '22', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', '0', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', '13', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', '13', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', '13', -16.5000, -2.5981);
    builder.addPermutation('#ff0000', [[16, 14, 19, 18, 17, 12]]);
    builder.addPermutation('#ffff00', [[10, 15, 14, 13, 12, 11]]);
    builder.addPermutation('#00ff00', [[6, 2, 7, 8, 9, 4]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addPermutation('#7f007f', [[8, 10]]);
    builder.addCircleArc('#ff0000', 'p17', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p15', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p20', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p19', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p18', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p11', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p16', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p15', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p14', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p12', 3.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p7', 3.0, true, false, false);
    builder.addCircleArc('#00ff00', 'p3', 3.0, true, false, false);
    builder.addCircleArc('#00ff00', 'p8', 3.0, true, false, true);
    builder.addCircleArc('#00ff00', 'p9', 3.0, true, false, true);
    builder.addCircleArc('#00ff00', 'p10', 3.0, true, false, false);
    builder.addCircleArc('#00ff00', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#0000ff', 'p1', 3.0, true, false, false);
    builder.addCircleArc('#0000ff', 'p2', 3.0, true, false, false);
    builder.addCircleArc('#0000ff', 'p3', 3.0, true, false, true);
    builder.addCircleArc('#0000ff', 'p4', 3.0, true, false, true);
    builder.addCircleArc('#0000ff', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#0000ff', 'p6', 3.0, true, false, false);
    builder.addCircleArc('#7f007f', 'p9', 3.0, false, false, false);
    builder.addCircleArc('#7f007f', 'p11', 3.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABK');
    builder.addEasier('ADV');
    builder.addEasier('AIG');

    builder.addHarder('ABY');
    builder.addHarder('ABZ');
    builder.addHarder('ACA');

    builder.addLocalMap('<image src="images/map_ABX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=ABK" alt="ABK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ABY" alt="ABY">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ABZ" alt="ABZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACA" alt="ACA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADV" alt="ADV">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AIG" alt="AIG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHU.puz
function AHU()
{
    var builder = new PuzzleBuilder('AHU');

    builder.addNode('q__8_9', '#ffff00', '0', -8, 9);
    builder.addNode('q__7_4', '#00ffff', '17', -7, 4);
    builder.addNode('q__3__1', '#00ff00', '22', -3, -1);
    builder.addNode('q__6_3', '#00ffff', '17', -6, 3);
    builder.addNode('q__9_2', '#7f007f', '8', -9, 2);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q__4_2', '#0000ff', '6', -4, 2);
    builder.addNode('q__5_10', '#7f007f', '8', -5, 10);
    builder.addNode('q__6__2', '#0000ff', '6', -6, -2);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q__3_3', '#ff0000', '13', -3, 3);
    builder.addNode('q__8_1', '#7f007f', '8', -8, 1);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__10_3', '#7f007f', '8', -10, 3);
    builder.addNode('q__9__1', '#00ff00', '22', -9, -1);
    builder.addNode('q__5_1', '#00ff00', '22', -5, 1);
    builder.addNode('q__5__5', '#00ff00', '22', -5, -5);
    builder.addNode('q__6_9', '#00ffff', '17', -6, 9);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q__5_4', '#7f007f', '8', -5, 4);
    builder.addNode('q__6_4', '#0000ff', '6', -6, 4);
    builder.addNode('q__5__2', '#7f007f', '8', -5, -2);
    builder.addNode('q__9_1', '#0000ff', '6', -9, 1);
    builder.addNode('q__4_7', '#00ffff', '17', -4, 7);
    builder.addNode('q__5_9', '#0000ff', '6', -5, 9);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q__7_10', '#00ffff', '17', -7, 10);
    builder.addNode('q__8__1', '#00ffff', '17', -8, -1);
    builder.addNode('q__5__1', '#ff0000', '13', -5, -1);
    builder.addNode('q__6_1', '#ffff00', '0', -6, 1);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__6__4', '#00ff00', '22', -6, -4);
    builder.addNode('q__9_9', '#ff0000', '13', -9, 9);
    builder.addNode('q__8_3', '#ffff00', '0', -8, 3);
    builder.addNode('q__8_8', '#ff0000', '13', -8, 8);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q__6_10', '#0000ff', '6', -6, 10);
    builder.addNode('q__7_2', '#ffff00', '0', -7, 2);
    builder.addNode('q__10_1', '#00ffff', '17', -10, 1);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__5_3', '#0000ff', '6', -5, 3);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q__4_4', '#ff0000', '13', -4, 4);
    builder.addNode('q__7_5', '#0000ff', '6', -7, 5);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5_6', '#ffff00', '0', -5, 6);
    builder.addNode('q__6_2', '#00ff00', '22', -6, 2);
    builder.addNode('q__9_3', '#ff0000', '13', -9, 3);
    builder.addNode('q__6__1', '#7f007f', '8', -6, -1);
    builder.addNode('q__3_4', '#ffff00', '0', -3, 4);
    builder.addNode('q__8_0', '#0000ff', '6', -8, 0);
    builder.addNode('q__10_2', '#0000ff', '6', -10, 2);
    builder.addNode('q__8_5', '#00ffff', '17', -8, 5);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q__6_8', '#00ff00', '22', -6, 8);
    builder.addNode('q__5_5', '#ff0000', '13', -5, 5);
    builder.addNode('q__6_7', '#ffff00', '0', -6, 7);
    builder.addNode('q__4_8', '#0000ff', '6', -4, 8);
    builder.addNode('q__4_6', '#00ff00', '22', -4, 6);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__3_7', '#0000ff', '6', -3, 7);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__3_8', '#7f007f', '8', -3, 8);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__4_3', '#7f007f', '8', -4, 3);
    builder.addNode('q__8_10', '#00ff00', '22', -8, 10);
    builder.addNode('q__8_2', '#ff0000', '13', -8, 2);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q__7_3', '#00ff00', '22', -7, 3);
    builder.addNode('q__10_0', '#00ff00', '22', -10, 0);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addNode('q__5_0', '#ffff00', '0', -5, 0);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__5_7', '#00ff00', '22', -5, 7);
    builder.addNode('q__6_5', '#7f007f', '8', -6, 5);
    builder.addNode('q__9_0', '#00ffff', '17', -9, 0);
    builder.addNode('q__4_0', '#00ff00', '22', -4, 0);
    builder.addNode('q__5_8', '#00ffff', '17', -5, 8);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q__7_9', '#00ff00', '22', -7, 9);
    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q__4__1', '#ffff00', '0', -4, -1);
    builder.addNode('q__6__3', '#00ffff', '17', -6, -3);
    builder.addNode('q__9_8', '#7f007f', '8', -9, 8);
    builder.addNode('q__3_0', '#00ffff', '17', -3, 0);
    builder.addNode('q__8_4', '#00ff00', '22', -8, 4);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__7_1', '#ff0000', '13', -7, 1);
    builder.addNode('q__4__5', '#00ffff', '17', -4, -5);
    builder.addNode('q__6_0', '#ff0000', '13', -6, 0);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q__5_2', '#00ffff', '17', -5, 2);
    builder.addNode('q__6_6', '#ff0000', '13', -6, 6);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addPermutation('#0000ff', [[92, 54], [8, 50], [28, 21], [20, 81], [59, 23], [65, 12], [22, 4], [67, 95], [87, 93], [48, 29], [80, 84], [62, 66], [70, 11], [75, 79], [16, 100], [45, 1], [15, 98], [94, 38], [5, 88]]);
    builder.addPermutation('#ff00ff', [[42, 100], [2, 91], [55, 93], [83, 88], [6, 68], [70, 34], [53, 13], [32, 89], [64, 78], [14, 82], [49, 4], [57, 47], [33, 90], [73, 38], [48, 3], [52, 27], [56, 17], [97, 36], [28, 76], [41, 98]]);
    builder.addPermutation('#00ff00', [[55, 31], [41, 19], [86, 26], [42, 21], [69, 0], [60, 23], [24, 7], [25, 85], [20, 3], [44, 68], [63, 18], [77, 43], [80, 47], [9, 61], [37, 17], [73, 1], [22, 82], [99, 58], [71, 36], [5, 30], [10, 51], [74, 39], [96, 29], [72, 12], [46, 40]]);
    builder.addPermutation('#ffff00', [[27, 14], [4, 70], [36, 63], [85, 64], [78, 65], [93, 75], [30, 42], [95, 16], [11, 22], [90, 35], [23, 80], [17, 86], [82, 52], [29, 94], [0, 33], [98, 6], [100, 67], [12, 9], [3, 73], [38, 48], [79, 87], [47, 60], [61, 72], [21, 5], [88, 28], [1, 20], [68, 41], [40, 55]]);
    builder.addPermutation('#ff0000', [[66, 59], [98, 48], [54, 45], [81, 57], [58, 80], [23, 62], [34, 73], [1, 92], [29, 15], [100, 32], [26, 69], [47, 99], [17, 24], [68, 10], [76, 96], [38, 70], [89, 42], [13, 49], [18, 5], [7, 37], [39, 22], [12, 46], [51, 44], [31, 71], [21, 8], [19, 20], [3, 41], [50, 28], [36, 55], [4, 53], [82, 74], [84, 56], [43, 25], [93, 97], [88, 2], [91, 83]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHR');
    builder.addEasier('AHV');

    builder.addHarder('AHT');

    builder.addLocalMap('<image src="images/map_AHU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AHR" alt="AHR">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AHT" alt="AHT">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHU" alt="AHU">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHV" alt="AHV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGW.puz
function AGW()
{
    var builder = new PuzzleBuilder('AGW');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [5, 6], [7, 8]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [2, 5]]);
    builder.addPermutation('#0000ff', [[5, 7], [6, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFZ');

    builder.addHarder('AFY');
    builder.addHarder('AGV');

    builder.addLocalMap('<image src="images/map_AGW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFY" alt="AFY">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AFZ" alt="AFZ">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AGV" alt="AGV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AGW" alt="AGW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEP.puz
function AEP()
{
    var builder = new PuzzleBuilder('AEP');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 1.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', 1.0000, 1.7321);
    builder.addNode('p4', '#0000ff', '6', 0.0000, 1.7321);
    builder.addNode('p5', '#7f007f', '8', -0.5000, 0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5]]);
    builder.addPermutation('#00ff00', [[2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFJ');

    builder.addLocalMap('<image src="images/map_AEP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AEP" alt="AEP">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AFJ" alt="AFJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEN.puz
function AEN()
{
    var builder = new PuzzleBuilder('AEN');

    builder.addNode('coord11', '#ff0000', '13', 0, 0);
    builder.addNode('coord21', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('coord22', '#00ff00', '22', 1.5000, 0.8660);
    builder.addNode('coord32', '#0000ff', '6', 2.5000, 0.8660);
    builder.addNode('coord33', '#7f007f', '8', 3.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#00ff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAS');
    builder.addEasier('ACP');

    builder.addHarder('AAP');
    builder.addHarder('ACS');
    builder.addHarder('ADY');

    builder.addLocalMap('<image src="images/map_AEN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="225.0,0.0,325.0,100.0" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ACP" alt="ACP">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACS" alt="ACS">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ADY" alt="ADY">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AEN" alt="AEN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAX.puz
function AAX()
{
    var builder = new PuzzleBuilder('AAX');

    builder.addNode('p0', '#ff0000', '13', 0.8660, 0.5000);
    builder.addNode('p1', '#ffff00', '0', -0.8660, 0.5000);
    builder.addNode('p2', '#00ff00', '22', -0.0000, -1.0000);
    builder.addNode('p3', '#00ffff', '17', 0.0000, 2.0000);
    builder.addNode('p4', '#0000ff', '6', -1.7321, -1.0000);
    builder.addNode('p5', '#7f007f', '8', 1.7321, -1.0000);
    builder.addPermutation('#ff0000', [[0, 2, 5]]);
    builder.addPermutation('#00ff00', [[1, 4, 2]]);
    builder.addPermutation('#0000ff', [[0, 3, 1]]);
    builder.addPermutation('#7f007f', [[0, 1, 2]]);
    builder.addCircleArc('#ff0000', 'p0', 0.999977999758, true, false, true);
    builder.addCircleArc('#ff0000', 'p2', 0.999977999758, true, false, false);
    builder.addCircleArc('#ff0000', 'p5', 0.999977999758, true, false, false);
    builder.addCircleArc('#00ff00', 'p1', 0.999977999758, true, false, true);
    builder.addCircleArc('#00ff00', 'p4', 0.999977999758, true, false, false);
    builder.addCircleArc('#00ff00', 'p2', 0.999977999758, true, false, false);
    builder.addCircleArc('#0000ff', 'p0', 0.999977999758, true, false, false);
    builder.addCircleArc('#0000ff', 'p3', 0.999977999758, true, false, true);
    builder.addCircleArc('#0000ff', 'p1', 0.999977999758, true, false, false);
    builder.addCircleArc('#7f007f', 'p0', 0.999977999758, true, false, false);
    builder.addCircleArc('#7f007f', 'p1', 0.999977999758, true, false, true);
    builder.addCircleArc('#7f007f', 'p2', 0.999977999758, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAM');

    builder.addHarder('ABR');

    builder.addLocalMap('<image src="images/map_AAX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAM" alt="AAM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAX" alt="AAX">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABR" alt="ABR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACY.puz
function ACY()
{
    var builder = new PuzzleBuilder('ACY');

    builder.addNode('p0', '#ff0000', '13', -2.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', -1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 0.0000, 1.0000);
    builder.addNode('p3', '#00ffff', '17', -0.0000, -1.0000);
    builder.addNode('p4', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('p5', '#ff00ff', '4', 2.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#00ff00', [[1, 3], [2, 4]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAE');
    builder.addEasier('ACR');

    builder.addHarder('ADD');

    builder.addLocalMap('<image src="images/map_ACY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AAE" alt="AAE">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACY" alt="ACY">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ADD" alt="ADD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABZ.puz
function ABZ()
{
    var builder = new PuzzleBuilder('ABZ');

    builder.addNode('p1', '#7f007f', '8', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', '8', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', '6', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', '6', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', '6', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', '8', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', '6', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', '17', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', '17', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', '17', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', '22', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', '22', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', '0', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', '0', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', '0', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', '22', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', '0', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', '13', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', '13', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', '13', -16.5000, -2.5981);
    builder.addPermutation('#ff0000', [[16, 14, 19, 18, 17, 12], [0, 1, 2, 3, 4, 5]]);
    builder.addPermutation('#ffff00', [[10, 15, 14, 13, 12, 11], [6, 2, 7, 8, 9, 4]]);
    builder.addPermutation('#7f007f', [[8, 10]]);
    builder.addCircleArc('#ff0000', 'p17', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p15', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p20', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p19', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p18', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p11', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p16', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p15', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p14', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p12', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p7', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p3', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p8', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p9', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p10', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p1', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p2', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p3', 3.0, true, false, true);
    builder.addCircleArc('#ff0000', 'p4', 3.0, true, false, true);
    builder.addCircleArc('#ff0000', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p6', 3.0, true, false, false);
    builder.addCircleArc('#7f007f', 'p9', 3.0, false, false, false);
    builder.addCircleArc('#7f007f', 'p11', 3.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABX');

    builder.addLocalMap('<image src="images/map_ABZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ABZ" alt="ABZ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABM.puz
function ABM()
{
    var builder = new PuzzleBuilder('ABM');

    builder.addNode('p1', '#ffff00', '0', 1.5000, 2.5981);
    builder.addNode('p2', '#ffff00', '0', 1.5000, -2.5981);
    builder.addNode('p3', '#ffff00', '0', -3.0000, -0.0000);
    builder.addNode('p4', '#ffff00', '0', -2.5000, 4.3301);
    builder.addNode('p5', '#ffff00', '0', 5.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', -2.5000, -4.3301);
    builder.addNode('p7', '#ffff00', '0', -1.5000, 6.0622);
    builder.addNode('p8', '#ffff00', '0', 6.0000, -1.7321);
    builder.addNode('p9', '#ffff00', '0', -4.5000, -4.3301);
    builder.addNode('p10', '#0000ff', '6', -8.0000, -0.0000);
    builder.addNode('p11', '#0000ff', '6', -9.5000, 0.8660);
    builder.addNode('p12', '#0000ff', '6', -9.5000, -0.8660);
    builder.addNode('p13', '#ff0000', '13', 4.0000, 6.9282);
    builder.addNode('p14', '#ff0000', '13', 4.0000, 8.6603);
    builder.addNode('p15', '#ff0000', '13', 5.5000, 7.7942);
    builder.addNode('p16', '#00ff00', '22', 4.0000, -6.9282);
    builder.addNode('p17', '#00ff00', '22', 5.5000, -7.7942);
    builder.addNode('p18', '#00ff00', '22', 4.0000, -8.6603);
    builder.addNode('p19', '#ff0000', '13', -5.0000, -8.6603);
    builder.addNode('p20', '#ff0000', '13', -8.0000, -13.8564);
    builder.addNode('p21', '#ff0000', '13', -11.0000, -8.6603);
    builder.addNode('p22', '#ff0000', '13', -7.0000, -8.6603);
    builder.addNode('p23', '#ff0000', '13', -7.0000, -12.1244);
    builder.addNode('p24', '#ff0000', '13', -10.0000, -10.3923);
    builder.addNode('p25', '#0000ff', '6', 11.0000, -1.7321);
    builder.addNode('p26', '#0000ff', '6', 14.0000, 0.0000);
    builder.addNode('p27', '#0000ff', '6', 14.0000, -3.4641);
    builder.addNode('p28', '#0000ff', '6', 10.0000, 0.0000);
    builder.addNode('p29', '#0000ff', '6', 16.0000, 0.0000);
    builder.addNode('p30', '#0000ff', '6', 13.0000, -5.1962);
    builder.addNode('p31', '#00ff00', '22', -4.0000, 10.3923);
    builder.addNode('p32', '#00ff00', '22', -7.0000, 12.1244);
    builder.addNode('p33', '#00ff00', '22', -4.0000, 13.8564);
    builder.addNode('p34', '#00ff00', '22', -5.0000, 8.6603);
    builder.addNode('p35', '#00ff00', '22', -8.0000, 13.8564);
    builder.addNode('p36', '#00ff00', '22', -2.0000, 13.8564);
    builder.addPermutation('#ff0000', [[21, 22, 23], [18, 19, 20], [12, 13, 14]]);
    builder.addPermutation('#00ff00', [[30, 31, 32], [33, 34, 35], [15, 16, 17]]);
    builder.addPermutation('#0000ff', [[24, 25, 26], [27, 28, 29], [9, 10, 11]]);
    builder.addPermutation('#ffff00', [[0, 1, 2], [3, 4, 5], [6, 7, 8]]);
    builder.addPermutation('#00ffff', [[11, 10, 33, 13, 14, 27, 16, 17, 18]]);
    builder.addPermutation('#7f007f', [[3, 33], [4, 27], [5, 18], [6, 30], [7, 24], [8, 21], [0, 12], [1, 15], [2, 9]]);
    builder.addCircleArc('#ff0000', 'p22', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p23', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p24', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p19', 3.46410161514, false, false, false);
    builder.addCircleArc('#ff0000', 'p20', 3.46410161514, false, true, false);
    builder.addCircleArc('#ff0000', 'p21', 3.46410161514, false, false, false);
    builder.addCircleArc('#ff0000', 'p13', 1.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p14', 1.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p15', 1.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p31', 2.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p32', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p33', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p34', 3.46410161514, false, true, false);
    builder.addCircleArc('#00ff00', 'p35', 3.46410161514, false, false, false);
    builder.addCircleArc('#00ff00', 'p36', 3.46410161514, false, false, false);
    builder.addCircleArc('#00ff00', 'p16', 1.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p17', 1.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p18', 1.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p25', 2.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p26', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p27', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p28', 3.46410161514, false, false, false);
    builder.addCircleArc('#0000ff', 'p29', 3.46410161514, false, false, false);
    builder.addCircleArc('#0000ff', 'p30', 3.46410161514, false, true, false);
    builder.addCircleArc('#0000ff', 'p10', 1.0, true, false, false);
    builder.addCircleArc('#0000ff', 'p11', 1.0, true, false, true);
    builder.addCircleArc('#0000ff', 'p12', 1.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p1', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p2', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p3', 3.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p4', 5.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p5', 5.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p6', 5.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p7', 6.2449979984, false, false, false);
    builder.addCircleArc('#ffff00', 'p8', 6.2449979984, false, false, false);
    builder.addCircleArc('#ffff00', 'p9', 6.2449979984, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABJ');
    builder.addEasier('ABO');
    builder.addEasier('ABS');

    builder.addLocalMap('<image src="images/map_ABM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="12.5,12.5,112.5,112.5" href="index.html?puzzle=ABJ" alt="ABJ">');
    builder.addLocalMap('<area shape="rect" coords="200.0,262.5,300.0,362.5" href="index.html?puzzle=ABM" alt="ABM">');
    builder.addLocalMap('<area shape="rect" coords="387.5,12.5,487.5,112.5" href="index.html?puzzle=ABO" alt="ABO">');
    builder.addLocalMap('<area shape="rect" coords="200.0,12.5,300.0,112.5" href="index.html?puzzle=ABS" alt="ABS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAH.puz
function AAH()
{
    var builder = new PuzzleBuilder('AAH');

    builder.addNode('ul', '#ff0000', '13', 3, 1);
    builder.addNode('ur', '#ffff00', '0', 6, 1);
    builder.addNode('rhs', '#00ff00', '22', 8, 4);
    builder.addNode('br', '#00ffff', '17', 6, 7);
    builder.addNode('bl', '#0000ff', '6', 3, 7);
    builder.addNode('lhs', '#7f007f', '8', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1], [4, 3]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'bl', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'br', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAG');

    builder.addHarder('AAI');
    builder.addHarder('AAN');

    builder.addLocalMap('<image src="images/map_AAH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAG" alt="AAG">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AAH" alt="AAH">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAI" alt="AAI">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AAN" alt="AAN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADJ.puz
function ADJ()
{
    var builder = new PuzzleBuilder('ADJ');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p9', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p11', '#7f007f', '8', 1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 8]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [5, 9]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6], [3, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADH');
    builder.addEasier('ADI');

    builder.addHarder('ADL');

    builder.addLocalMap('<image src="images/map_ADJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADJ" alt="ADJ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ADL" alt="ADL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIE.puz
function AIE()
{
    var builder = new PuzzleBuilder('AIE');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.3090, 0.9511);
    builder.addNode('p2', '#00ff00', '22', -0.8090, 0.5878);
    builder.addNode('p3', '#0000ff', '6', -0.8090, -0.5878);
    builder.addNode('p4', '#7f007f', '8', 0.3090, -0.9511);
    builder.addNode('p5', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', 0.6180, 1.9021);
    builder.addNode('p7', '#00ff00', '22', -1.6180, 1.1756);
    builder.addNode('p8', '#0000ff', '6', -1.6180, -1.1756);
    builder.addNode('p9', '#7f007f', '8', 0.6180, -1.9021);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [2, 7]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 2], [3, 8]]);
    builder.addPermutation('#0000ff', [[0, 5], [1, 6], [2, 3], [4, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACQ');

    builder.addHarder('AIC');

    builder.addLocalMap('<image src="images/map_AIE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ACQ" alt="ACQ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AIC" alt="AIC">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AIE" alt="AIE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIH.puz
function AIH()
{
    var builder = new PuzzleBuilder('AIH');

    builder.addNode('p0', '#00ffff', '17', 1.0000, 0.0000);
    builder.addNode('p1', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('p3', '#0000ff', '6', 3.0000, 0.0000);
    builder.addNode('p4', '#7f007f', '8', 4.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 4.5000, 0.8660);
    builder.addNode('p6', '#ffff00', '0', -1.5000, 2.5981);
    builder.addNode('p7', '#ffff00', '0', -1.5000, 4.3301);
    builder.addNode('p8', '#ff0000', '13', -3.0000, 3.4641);
    builder.addNode('p9', '#ffff00', '0', -1.5000, -2.5981);
    builder.addNode('p10', '#ff0000', '13', -3.0000, -3.4641);
    builder.addNode('p11', '#ffff00', '0', -1.5000, -4.3301);
    builder.addPermutation('#ff0000', [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]]);
    builder.addPermutation('#0000ff', [[0, 3], [1, 6], [2, 9], [4, 11], [5, 7], [8, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIJ');

    builder.addHarder('ACG');
    builder.addHarder('AII');

    builder.addLocalMap('<image src="images/map_AIH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACG" alt="ACG">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AIH" alt="AIH">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AII" alt="AII">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AIJ" alt="AIJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAG.puz
function AAG()
{
    var builder = new PuzzleBuilder('AAG');

    builder.addNode('ul', '#ff0000', '13', 3, 1);
    builder.addNode('ur', '#ffff00', '0', 6, 1);
    builder.addNode('rhs', '#00ff00', '22', 8, 4);
    builder.addNode('br', '#00ffff', '17', 6, 7);
    builder.addNode('bl', '#0000ff', '6', 3, 7);
    builder.addNode('lhs', '#7f007f', '8', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAT');

    builder.addHarder('AAH');

    builder.addLocalMap('<image src="images/map_AAG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAG" alt="AAG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAH" alt="AAH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAT" alt="AAT">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACH.puz
function ACH()
{
    var builder = new PuzzleBuilder('ACH');

    builder.addNode('p1', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#ffff00', '0', -1.0000, 1.7321);
    builder.addNode('p4', '#00ff00', '22', -2.0000, 0.0000);
    builder.addNode('p5', '#00ffff', '17', -1.0000, -1.7321);
    builder.addNode('p6', '#00ffff', '17', 1.0000, -1.7321);
    builder.addNode('p7', '#00ff00', '22', 5.0000, 0.0000);
    builder.addNode('p8', '#ff7f00', '10', 2.5000, 4.3301);
    builder.addNode('p9', '#ff7f00', '10', -2.5000, 4.3301);
    builder.addNode('p10', '#00ff00', '22', -5.0000, 0.0000);
    builder.addNode('p11', '#0000ff', '6', -2.5000, -4.3301);
    builder.addNode('p12', '#0000ff', '6', 2.5000, -4.3301);
    builder.addNode('p13', '#ffff00', '0', 6.0000, 1.7321);
    builder.addNode('p14', '#ff7f00', '10', 4.5000, 4.3301);
    builder.addNode('p15', '#ff0000', '13', 1.5000, 6.0622);
    builder.addNode('p16', '#ff0000', '13', -1.5000, 6.0622);
    builder.addNode('p17', '#ff7f00', '10', -4.5000, 4.3301);
    builder.addNode('p18', '#ffff00', '0', -6.0000, 1.7321);
    builder.addNode('p19', '#00ffff', '17', -6.0000, -1.7321);
    builder.addNode('p20', '#0000ff', '6', -4.5000, -4.3301);
    builder.addNode('p21', '#7f007f', '8', -1.5000, -6.0622);
    builder.addNode('p22', '#7f007f', '8', 1.5000, -6.0622);
    builder.addNode('p23', '#0000ff', '6', 4.5000, -4.3301);
    builder.addNode('p24', '#00ffff', '17', 6.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 2, 4], [1, 5, 3]]);
    builder.addPermutation('#ffff00', [[6, 23, 12], [9, 18, 17]]);
    builder.addPermutation('#00ff00', [[7, 14, 13], [10, 19, 20]]);
    builder.addPermutation('#7f007f', [[8, 15, 16], [11, 22, 21]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23]]);
    builder.addCircleArc('#0000ff', 'p1', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p4', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p13', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p15', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p16', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p17', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p18', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p19', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p20', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p21', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p22', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p23', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p24', 4.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACG');
    builder.addEasier('AII');

    builder.addHarder('ACJ');

    builder.addLocalMap('<image src="images/map_ACH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ACG" alt="ACG">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACH" alt="ACH">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ACJ" alt="ACJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AII" alt="AII">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACZ.puz
function ACZ()
{
    var builder = new PuzzleBuilder('ACZ');

    builder.addNode('p0', '#ff0000', '13', 0.0000, 1.7321);
    builder.addNode('p1', '#ff0000', '13', -1.0000, 1.7321);
    builder.addNode('p2', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p3', '#ffff00', '0', -1.5000, 0.8660);
    builder.addNode('p4', '#00ff00', '22', 0, 0);
    builder.addNode('p5', '#00ff00', '22', -1.0000, -0.0000);
    builder.addNode('p6', '#0000ff', '6', 0.5000, -0.8660);
    builder.addNode('p7', '#0000ff', '6', -1.5000, -0.8660);
    builder.addNode('p8', '#7f007f', '8', -0.0000, -1.7321);
    builder.addNode('p9', '#7f007f', '8', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 2], [3, 5], [4, 6], [7, 9]]);
    builder.addPermutation('#0000ff', [[1, 3], [2, 4], [5, 7], [6, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AED');

    builder.addHarder('ACW');

    builder.addLocalMap('<image src="images/map_ACZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACW" alt="ACW">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ACZ" alt="ACZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AED" alt="AED">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABU.puz
function ABU()
{
    var builder = new PuzzleBuilder('ABU');

    builder.addNode('p1', '#ffffff', '11', 0.0000, 0.0000);
    builder.addNode('p2', '#7f007f', '8', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', '13', 0.0000, 5.1962);
    builder.addNode('p4', '#ffff00', '0', 4.5000, 2.5981);
    builder.addNode('p5', '#00ff00', '22', 4.5000, -2.5981);
    builder.addNode('p6', '#00ffff', '17', 0.0000, -5.1962);
    builder.addNode('p7', '#0000ff', '6', -4.5000, -2.5981);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3]]);
    builder.addPermutation('#00ff00', [[0, 3, 4, 5]]);
    builder.addPermutation('#0000ff', [[0, 5, 6, 1]]);
    builder.addCircleArc('#ff0000', 'p1', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p4', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p1', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p4', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p5', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p6', 5.19615242271, false, true, false);
    builder.addCircleArc('#0000ff', 'p1', 5.19615242271, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 5.19615242271, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 5.19615242271, false, true, false);
    builder.addCircleArc('#0000ff', 'p2', 5.19615242271, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABK');

    builder.addHarder('ABV');
    builder.addHarder('ACE');
    builder.addHarder('AHW');

    builder.addLocalMap('<image src="images/map_ABU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ABK" alt="ABK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ABU" alt="ABU">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ABV" alt="ABV">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACE" alt="ACE">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AHW" alt="AHW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHJ.puz
function AHJ()
{
    var builder = new PuzzleBuilder('AHJ');

    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addPermutation('#0000ff', [[2, 0], [8, 5]]);
    builder.addPermutation('#ffff00', [[6, 7], [4, 3], [5, 1]]);
    builder.addPermutation('#00ffff', [[1, 6]]);
    builder.addPermutation('#ff00ff', [[7, 4]]);
    builder.addPermutation('#ff0000', [[0, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFZ');

    builder.addHarder('AHI');
    builder.addHarder('AHM');

    builder.addLocalMap('<image src="images/map_AHJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AFZ" alt="AFZ">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHI" alt="AHI">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHJ" alt="AHJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHM" alt="AHM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHS.puz
function AHS()
{
    var builder = new PuzzleBuilder('AHS');

    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__3__1', '#00ff00', '22', -3, -1);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q__6__2', '#0000ff', '6', -6, -2);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q__8_1', '#7f007f', '8', -8, 1);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__9_1', '#0000ff', '6', -9, 1);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__5_1', '#00ff00', '22', -5, 1);
    builder.addNode('q__5__5', '#00ff00', '22', -5, -5);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q__8_2', '#ff0000', '13', -8, 2);
    builder.addNode('q__5__2', '#7f007f', '8', -5, -2);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addNode('q__5_0', '#ffff00', '0', -5, 0);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q__5__1', '#ff0000', '13', -5, -1);
    builder.addNode('q__6_1', '#ffff00', '0', -6, 1);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__6__4', '#00ff00', '22', -6, -4);
    builder.addNode('q__9_0', '#00ffff', '17', -9, 0);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q__4_0', '#00ff00', '22', -4, 0);
    builder.addNode('q__7_2', '#ffff00', '0', -7, 2);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__4__1', '#ffff00', '0', -4, -1);
    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q__6__3', '#00ffff', '17', -6, -3);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__3_0', '#00ffff', '17', -3, 0);
    builder.addNode('q__6_2', '#00ff00', '22', -6, 2);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q__6__1', '#7f007f', '8', -6, -1);
    builder.addNode('q__7_1', '#ff0000', '13', -7, 1);
    builder.addNode('q__4__5', '#00ffff', '17', -4, -5);
    builder.addNode('q__6_0', '#ff0000', '13', -6, 0);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5_2', '#00ffff', '17', -5, 2);
    builder.addNode('q__8_0', '#0000ff', '6', -8, 0);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addPermutation('#0000ff', [[49, 27], [50, 37], [25, 24], [21, 36], [29, 30], [20, 17], [7, 32], [18, 33], [40, 28], [2, 42], [19, 6], [15, 14]]);
    builder.addPermutation('#ffff00', [[6, 29], [53, 13], [4, 12], [42, 18], [28, 20], [17, 40], [48, 10], [30, 19], [33, 2], [38, 26], [35, 16], [0, 45], [36, 11]]);
    builder.addPermutation('#00ff00', [[8, 39], [27, 47], [37, 2], [43, 34], [14, 40], [38, 1], [0, 22]]);
    builder.addPermutation('#00ffff', [[20, 53], [1, 43], [2, 0], [34, 38], [45, 33], [11, 4], [31, 41], [26, 23]]);
    builder.addPermutation('#ff00ff', [[3, 46], [26, 17], [12, 6], [13, 48], [39, 0], [44, 27], [16, 5], [22, 8], [10, 53], [9, 51], [47, 35], [40, 38]]);
    builder.addPermutation('#ff0000', [[41, 20], [51, 44], [5, 7], [33, 15], [27, 9], [6, 50], [17, 3], [23, 49], [46, 26], [53, 31], [24, 21], [32, 52]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHP');

    builder.addHarder('AHR');
    builder.addHarder('AHV');

    builder.addLocalMap('<image src="images/map_AHS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AHP" alt="AHP">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHR" alt="AHR">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHS" alt="AHS">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHV" alt="AHV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADV.puz
function ADV()
{
    var builder = new PuzzleBuilder('ADV');

    builder.addNode('x0', '#ff0000', '13', 0.0000, 0.0000);
    builder.addNode('x1', '#ff0000', '13', -1.0000, 1.0000);
    builder.addNode('x2', '#ff0000', '13', -2.0000, 0.0000);
    builder.addNode('x3', '#ff0000', '13', -1.0000, -1.0000);
    builder.addNode('y0', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 2.5000, 0.8660);
    builder.addNode('y3', '#0000ff', '6', 3.0000, 0.0000);
    builder.addNode('y4', '#0000ff', '6', 2.5000, -0.8660);
    builder.addNode('y5', '#0000ff', '6', 1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3]]);
    builder.addPermutation('#0000ff', [[4, 9, 8, 7, 6, 5]]);
    builder.addPermutation('#00ff00', [[0, 4]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y4', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y5', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADP');
    builder.addEasier('ADU');

    builder.addHarder('ABX');

    builder.addLocalMap('<image src="images/map_ADV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADP" alt="ADP">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ADU" alt="ADU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADV" alt="ADV">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFE.puz
function AFE()
{
    var builder = new PuzzleBuilder('AFE');

    builder.addNode('lhs', '#ff0000', '13', 0.3090, 0.9511);
    builder.addNode('mid', '#ffff00', '0', 0, 0);
    builder.addNode('rhs', '#0000ff', '6', -0.8090, 0.5878);
    builder.addNode('top', '#7f007f', '8', -0.8090, -0.5878);
    builder.addNode('bot', '#00ff00', '22', 0.3090, -0.9511);
    builder.addNode('six', '#00ffff', '17', 1.3090, 0.9511);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[1, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);
    builder.addPermutation('#7f007f', [[0, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADB');
    builder.addEasier('AEM');

    builder.addHarder('AFG');

    builder.addLocalMap('<image src="images/map_AFE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ADB" alt="ADB">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEM" alt="AEM">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFE" alt="AFE">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AFG" alt="AFG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGT.puz
function AGT()
{
    var builder = new PuzzleBuilder('AGT');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p33', '#ff00ff', '4', 3, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7], [9, 10]]);
    builder.addPermutation('#ffff00', [[5, 6], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [5, 8], [6, 9], [7, 10]]);
    builder.addPermutation('#0000ff', [[2, 4], [3, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGR');

    builder.addHarder('AGX');

    builder.addLocalMap('<image src="images/map_AGT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGR" alt="AGR">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGT" alt="AGT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGX" alt="AGX">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADT.puz
function ADT()
{
    var builder = new PuzzleBuilder('ADT');

    builder.addNode('p00', '#ff0000', '13', 7, 0.0);
    builder.addNode('p10', '#ffff00', '0', 3, 3.0);
    builder.addNode('p11', '#ffff00', '0', 11, 3.0);
    builder.addNode('p20', '#00ff00', '22', 1, 6.0);
    builder.addNode('p21', '#00ff00', '22', 5, 6.0);
    builder.addNode('p22', '#00ff00', '22', 9, 6.0);
    builder.addNode('p23', '#00ff00', '22', 13, 6.0);
    builder.addPermutation('#ff0000', [[1, 3], [2, 5]]);
    builder.addPermutation('#0000ff', [[1, 4], [2, 6]]);
    builder.addPermutation('#00ff00', [[0, 1]]);
    builder.addPermutation('#ffff00', [[0, 2]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAS');
    builder.addEasier('ACR');
    builder.addEasier('ADZ');

    builder.addHarder('AFI');

    builder.addLocalMap('<image src="images/map_ADT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADT" alt="ADT">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADZ" alt="ADZ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFI" alt="AFI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACQ.puz
function ACQ()
{
    var builder = new PuzzleBuilder('ACQ');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.3090, 0.9511);
    builder.addNode('p2', '#00ff00', '22', -0.8090, 0.5878);
    builder.addNode('p3', '#0000ff', '6', -0.8090, -0.5878);
    builder.addNode('p4', '#7f007f', '8', 0.3090, -0.9511);
    builder.addPermutation('#ff0000', [[0, 4], [2, 3]]);
    builder.addPermutation('#00ff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[0, 1], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACX');

    builder.addHarder('ACT');
    builder.addHarder('AID');
    builder.addHarder('AIE');

    builder.addLocalMap('<image src="images/map_ACQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ACQ" alt="ACQ">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ACT" alt="ACT">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ACX" alt="ACX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AID" alt="AID">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AIE" alt="AIE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABV.puz
function ABV()
{
    var builder = new PuzzleBuilder('ABV');

    builder.addNode('p1', '#ffffff', '11', 0.0000, 0.0000);
    builder.addNode('p2', '#7f007f', '8', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', '13', 0.0000, 5.1962);
    builder.addNode('p4', '#ffff00', '0', 4.5000, 2.5981);
    builder.addNode('p5', '#00ff00', '22', 4.5000, -2.5981);
    builder.addNode('p6', '#00ffff', '17', 0.0000, -5.1962);
    builder.addNode('p7', '#0000ff', '6', -4.5000, -2.5981);
    builder.addNode('p8', '#7f007f', '8', -2.2500, 1.2990);
    builder.addNode('p9', '#ffff00', '0', 2.2500, 1.2990);
    builder.addNode('p10', '#00ffff', '17', -0.0000, -2.5981);
    builder.addNode('p11', '#ff0000', '13', -2.2500, 3.8971);
    builder.addNode('p12', '#ff0000', '13', 2.2500, 3.8971);
    builder.addNode('p13', '#00ff00', '22', 4.5000, 0.0000);
    builder.addNode('p14', '#00ff00', '22', 2.2500, -3.8971);
    builder.addNode('p15', '#0000ff', '6', -2.2500, -3.8971);
    builder.addNode('p16', '#0000ff', '6', -4.5000, -0.0000);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3], [7, 10, 11, 8]]);
    builder.addPermutation('#00ff00', [[0, 3, 4, 5], [8, 12, 13, 9]]);
    builder.addPermutation('#0000ff', [[0, 5, 6, 1], [9, 14, 15, 7]]);
    builder.addCircleArc('#ff0000', 'p1', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p4', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p1', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p4', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p5', 5.19615242271, false, false, false);
    builder.addCircleArc('#00ff00', 'p6', 5.19615242271, false, true, false);
    builder.addCircleArc('#0000ff', 'p1', 5.19615242271, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 5.19615242271, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 5.19615242271, false, true, false);
    builder.addCircleArc('#0000ff', 'p2', 5.19615242271, false, false, false);
    builder.addCircleArc('#ff0000', 'p8', 2.59807621135, false, true, false);
    builder.addCircleArc('#ff0000', 'p11', 4.5, false, false, false);
    builder.addCircleArc('#ff0000', 'p12', 2.59807621135, false, false, false);
    builder.addCircleArc('#ff0000', 'p9', 4.5, false, false, false);
    builder.addCircleArc('#00ff00', 'p9', 2.59807621135, false, false, false);
    builder.addCircleArc('#00ff00', 'p13', 4.5, false, false, false);
    builder.addCircleArc('#00ff00', 'p14', 2.59807621135, false, false, false);
    builder.addCircleArc('#00ff00', 'p10', 4.5, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 2.59807621135, false, false, false);
    builder.addCircleArc('#0000ff', 'p15', 4.5, false, false, false);
    builder.addCircleArc('#0000ff', 'p16', 2.59807621135, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 4.5, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABU');
    builder.addEasier('ABW');

    builder.addHarder('AHY');

    builder.addLocalMap('<image src="images/map_ABV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ABU" alt="ABU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABV" alt="ABV">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ABW" alt="ABW">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AHY" alt="AHY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADQ.puz
function ADQ()
{
    var builder = new PuzzleBuilder('ADQ');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ff0000', '13', -1.5000, -0.8660);
    builder.addNode('y1', '#0000ff', '6', 0.6910, 0.9511);
    builder.addNode('y2', '#0000ff', '6', 1.8090, 0.5878);
    builder.addNode('y3', '#0000ff', '6', 1.8090, -0.5878);
    builder.addNode('y4', '#0000ff', '6', 0.6910, -0.9511);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[0, 6, 5, 4, 3]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, true);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, true);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y4', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADO');

    builder.addHarder('ADR');
    builder.addHarder('ADX');

    builder.addLocalMap('<image src="images/map_ADQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ADO" alt="ADO">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADQ" alt="ADQ">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ADR" alt="ADR">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADX" alt="ADX">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFX.puz
function AFX()
{
    var builder = new PuzzleBuilder('AFX');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p33', '#ff00ff', '4', 3, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [6, 7], [8, 9]]);
    builder.addPermutation('#ffff00', [[3, 4], [5, 6]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [6, 8], [7, 9]]);
    builder.addPermutation('#0000ff', [[3, 5], [4, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFW');

    builder.addLocalMap('<image src="images/map_AFX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AFW" alt="AFW">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AFX" alt="AFX">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGL.puz
function AGL()
{
    var builder = new PuzzleBuilder('AGL');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6], [7, 8], [10, 11]]);
    builder.addPermutation('#ffff00', [[1, 2], [3, 4], [6, 7], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]);
    builder.addPermutation('#0000ff', [[7, 10], [8, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGK');

    builder.addHarder('AGM');

    builder.addLocalMap('<image src="images/map_AGL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGK" alt="AGK">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGL" alt="AGL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGM" alt="AGM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIA.puz
function AIA()
{
    var builder = new PuzzleBuilder('AIA');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.3090, 0.9511);
    builder.addNode('p2', '#00ff00', '22', -0.8090, 0.5878);
    builder.addNode('p3', '#0000ff', '6', -0.8090, -0.5878);
    builder.addNode('p4', '#7f007f', '8', 0.3090, -0.9511);
    builder.addNode('p5', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', 0.6180, 1.9021);
    builder.addNode('p7', '#00ff00', '22', -1.6180, 1.1756);
    builder.addNode('p8', '#0000ff', '6', -1.6180, -1.1756);
    builder.addNode('p9', '#7f007f', '8', 0.6180, -1.9021);
    builder.addNode('p10', '#ff0000', '13', -3.0000, 0.0000);
    builder.addNode('p11', '#ffff00', '0', -0.9271, -2.8532);
    builder.addNode('p12', '#00ff00', '22', 2.4271, -1.7634);
    builder.addNode('p13', '#0000ff', '6', 2.4271, 1.7634);
    builder.addNode('p14', '#7f007f', '8', -0.9271, 2.8532);
    builder.addNode('p15', '#ff0000', '13', -4.0000, 0.0000);
    builder.addNode('p16', '#ffff00', '0', -1.2361, -3.8042);
    builder.addNode('p17', '#00ff00', '22', 3.2361, -2.3511);
    builder.addNode('p18', '#0000ff', '6', 3.2361, 2.3511);
    builder.addNode('p19', '#7f007f', '8', -1.2361, 3.8042);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [2, 7], [5, 13], [6, 14], [8, 10], [9, 12], [11, 16], [15, 19], [17, 18]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 2], [3, 8], [5, 12], [6, 13], [7, 14], [9, 11], [10, 15], [16, 17], [18, 19]]);
    builder.addPermutation('#0000ff', [[0, 5], [1, 6], [2, 3], [4, 9], [7, 10], [8, 11], [12, 17], [13, 18], [14, 19], [15, 16]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIC');

    builder.addLocalMap('<image src="images/map_AIA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AIA" alt="AIA">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AIC" alt="AIC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFP.puz
function AFP()
{
    var builder = new PuzzleBuilder('AFP');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', -0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('p3', '#00ffff', '17', 1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('p5', '#7f007f', '8', 1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 3]]);
    builder.addPermutation('#0000ff', [[0, 2], [3, 4]]);
    builder.addPermutation('#7f007f', [[0, 1], [3, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFO');

    builder.addHarder('ADF');
    builder.addHarder('AFR');

    builder.addLocalMap('<image src="images/map_AFP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ADF" alt="ADF">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AFO" alt="AFO">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFP" alt="AFP">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFR" alt="AFR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEL.puz
function AEL()
{
    var builder = new PuzzleBuilder('AEL');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ffff00', '0', -1.5000, -0.8660);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('z0', '#00ff00', '22', -3.0000, -1.7321);
    builder.addNode('z2', '#00ff00', '22', -1.5000, -2.5981);
    builder.addPermutation('#ff0000', [[0, 4, 3], [2, 5, 6]]);
    builder.addPermutation('#0000ff', [[0, 1, 2]]);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x1', 1, true, false, true);
    builder.addCircleArc('#0000ff', 'x2', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'y1', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'y2', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'z0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'z2', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADW');

    builder.addHarder('ABH');
    builder.addHarder('ACN');
    builder.addHarder('AFQ');
    builder.addHarder('AIG');

    builder.addLocalMap('<image src="images/map_AEL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=ABH" alt="ABH">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=ACN" alt="ACN">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=ADW" alt="ADW">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AEL" alt="AEL">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AFQ" alt="AFQ">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=AIG" alt="AIG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADH.puz
function ADH()
{
    var builder = new PuzzleBuilder('ADH');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p9', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 8]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 6]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [3, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADE');
    builder.addEasier('ADF');
    builder.addEasier('AFB');

    builder.addHarder('ACW');
    builder.addHarder('ADJ');
    builder.addHarder('ADK');

    builder.addLocalMap('<image src="images/map_ADH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACW" alt="ACW">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADE" alt="ADE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADF" alt="ADF">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADJ" alt="ADJ">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ADK" alt="ADK">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=AFB" alt="AFB">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEJ.puz
function AEJ()
{
    var builder = new PuzzleBuilder('AEJ');

    builder.addNode('p12', '#ff0000', '13', 1, 4);
    builder.addNode('p13', '#ffff00', '0', 1, 7);
    builder.addNode('p21', '#00ff00', '22', 4, 1);
    builder.addNode('p24', '#0000ff', '6', 4, 10);
    builder.addNode('p31', '#7f007f', '8', 7, 1);
    builder.addNode('p34', '#00ffff', '17', 7, 10);
    builder.addNode('p42', '#d01f90', '12', 10, 4);
    builder.addNode('p43', '#ff00ff', '4', 10, 7);
    builder.addPermutation('#ff0000', [[2, 4], [6, 7], [5, 3], [1, 0]]);
    builder.addPermutation('#0000ff', [[4, 6], [7, 5], [3, 1], [0, 2]]);
    builder.addPermutation('#ffff00', [[0, 6], [1, 7]]);
    builder.addPermutation('#00ff00', [[0, 5], [2, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEI');

    builder.addLocalMap('<image src="images/map_AEJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AEI" alt="AEI">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AEJ" alt="AEJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFU.puz
function AFU()
{
    var builder = new PuzzleBuilder('AFU');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#0000ff', '6', 0, 3);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#0000ff', '6', 1, 2);
    builder.addNode('p13', '#7f007f', '8', 1, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7]]);
    builder.addPermutation('#ffff00', [[1, 2], [5, 6]]);
    builder.addPermutation('#00ff00', [[0, 4], [2, 6]]);
    builder.addPermutation('#0000ff', [[1, 5], [3, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFS');

    builder.addHarder('AGC');
    builder.addHarder('AGS');

    builder.addLocalMap('<image src="images/map_AFU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AFS" alt="AFS">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFU" alt="AFU">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AGC" alt="AGC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AGS" alt="AGS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFO.puz
function AFO()
{
    var builder = new PuzzleBuilder('AFO');

    builder.addNode('p0', '#ff0000', '13', 1, 1);
    builder.addNode('p1', '#ffff00', '0', 1, 2);
    builder.addNode('p2', '#00ff00', '22', 0, 0);
    builder.addNode('p3', '#00ffff', '17', 2, 1);
    builder.addNode('p4', '#0000ff', '6', 3, 0);
    builder.addNode('p5', '#7f007f', '8', 2, 2);
    builder.addPermutation('#ff0000', [[0, 3]]);
    builder.addPermutation('#00ff00', [[0, 2]]);
    builder.addPermutation('#0000ff', [[3, 4]]);
    builder.addPermutation('#7f007f', [[0, 1], [3, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACR');
    builder.addEasier('AFN');

    builder.addHarder('AFP');

    builder.addLocalMap('<image src="images/map_AFO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AFN" alt="AFN">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFO" alt="AFO">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AFP" alt="AFP">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACA.puz
function ACA()
{
    var builder = new PuzzleBuilder('ACA');

    builder.addNode('p1', '#7f007f', '8', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', '8', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', '6', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', '6', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', '6', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', '8', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', '6', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', '17', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', '17', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', '17', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', '22', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', '22', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', '0', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', '0', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', '0', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', '22', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', '0', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', '13', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', '13', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', '13', -16.5000, -2.5981);
    builder.addPermutation('#ff0000', [[16, 14, 19, 18, 17, 12], [0, 1, 2, 3, 4, 5]]);
    builder.addPermutation('#ffff00', [[11, 12, 13, 14, 15, 10], [6, 2, 7, 8, 9, 4]]);
    builder.addPermutation('#7f007f', [[8, 10]]);
    builder.addCircleArc('#ff0000', 'p17', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p15', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p20', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p19', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p18', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p13', 3.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p11', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p16', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p15', 3.0, true, true, true);
    builder.addCircleArc('#ffff00', 'p14', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p13', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p12', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p7', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p3', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p8', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p9', 3.0, true, false, true);
    builder.addCircleArc('#ffff00', 'p10', 3.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p1', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p2', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p3', 3.0, true, false, true);
    builder.addCircleArc('#ff0000', 'p4', 3.0, true, false, true);
    builder.addCircleArc('#ff0000', 'p5', 3.0, true, false, false);
    builder.addCircleArc('#ff0000', 'p6', 3.0, true, false, false);
    builder.addCircleArc('#7f007f', 'p9', 3.0, false, false, false);
    builder.addCircleArc('#7f007f', 'p11', 3.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABX');

    builder.addLocalMap('<image src="images/map_ACA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ACA" alt="ACA">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACN.puz
function ACN()
{
    var builder = new PuzzleBuilder('ACN');

    builder.addNode('p1', '#7f007f', '8', -0.0000, -2.0000);
    builder.addNode('p2', '#7f007f', '8', 2.0000, 0.0000);
    builder.addNode('p3', '#7f007f', '8', 0.0000, 2.0000);
    builder.addNode('p4', '#7f007f', '8', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', '13', -0.0000, -5.0000);
    builder.addNode('p6', '#ffff00', '0', 5.0000, 0.0000);
    builder.addNode('p7', '#ffff00', '0', 9.0000, 0.0000);
    builder.addNode('p8', '#00ff00', '22', 0.0000, 5.0000);
    builder.addNode('p9', '#00ff00', '22', -1.7321, 8.0000);
    builder.addNode('p10', '#00ff00', '22', 1.7321, 8.0000);
    builder.addNode('p11', '#0000ff', '6', -5.0000, 0.0000);
    builder.addNode('p12', '#0000ff', '6', -7.0000, -2.0000);
    builder.addNode('p13', '#0000ff', '6', -9.0000, 0.0000);
    builder.addNode('p14', '#0000ff', '6', -7.0000, 2.0000);
    builder.addPermutation('#ff0000', [[4]]);
    builder.addPermutation('#ffff00', [[5, 6]]);
    builder.addPermutation('#00ff00', [[7, 8, 9]]);
    builder.addPermutation('#0000ff', [[10, 11, 12, 13]]);
    builder.addPermutation('#7f007f', [[0, 4], [1, 5], [2, 7], [3, 10]]);
    builder.addPermutation('#00ffff', [[0, 1, 2, 3]]);
    builder.addCircleArc('#00ffff', 'p1', 2.0, true, false, false);
    builder.addCircleArc('#00ffff', 'p4', 2.0, true, false, true);
    builder.addCircleArc('#00ffff', 'p3', 2.0, true, false, false);
    builder.addCircleArc('#00ffff', 'p2', 2.0, true, false, false);
    builder.addCircleArc('#ffff00', 'p6', 2.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p7', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p8', 2.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p9', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p10', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 2.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p13', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 2.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADP');
    builder.addEasier('AEL');

    builder.addHarder('ABN');

    builder.addLocalMap('<image src="images/map_ACN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ABN" alt="ABN">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACN" alt="ACN">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ADP" alt="ADP">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEL" alt="AEL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAR.puz
function AAR()
{
    var builder = new PuzzleBuilder('AAR');

    builder.addNode('coord11', '#ff0000', '13', 1, 1);
    builder.addNode('coord12', '#ff0000', '13', 1, 4);
    builder.addNode('coord22', '#0000ff', '6', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[1, 2]]);
    builder.addCircleArc('#ff0000', 'coord11', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'coord12', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord12', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord22', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAB');

    builder.addHarder('ADN');
    builder.addHarder('AEG');
    builder.addHarder('AHG');

    builder.addLocalMap('<image src="images/map_AAR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AAB" alt="AAB">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AAR" alt="AAR">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AEG" alt="AEG">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHG" alt="AHG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAO.puz
function AAO()
{
    var builder = new PuzzleBuilder('AAO');

    builder.addNode('p11', '#0000ff', '6', 1, 1);
    builder.addNode('p12', '#7f007f', '8', 1, 4);
    builder.addNode('p21', '#00ff00', '22', 4, 1);
    builder.addNode('p22', '#0000ff', '6', 4, 4);
    builder.addNode('p31', '#ffff00', '0', 7, 1);
    builder.addNode('p32', '#00ff00', '22', 7, 4);
    builder.addNode('p41', '#ff0000', '13', 10, 1);
    builder.addNode('p42', '#ffff00', '0', 10, 4);
    builder.addNode('p33', '#0000ff', '6', 7, 7);
    builder.addNode('p34', '#7f007f', '8', 7, 10);
    builder.addNode('p43', '#00ff00', '22', 10, 7);
    builder.addNode('p44', '#0000ff', '6', 10, 10);
    builder.addPermutation('#7f007f', [[0, 2, 3, 1], [4, 6, 7, 5], [8, 10, 11, 9]]);
    builder.addPermutation('#ff0000', [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]);
    builder.addCircleArc('#7f007f', 'p11', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p21', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p22', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p12', 2.12132034356, true, false, true);
    builder.addCircleArc('#7f007f', 'p31', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p41', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p42', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p32', 2.12132034356, true, false, true);
    builder.addCircleArc('#7f007f', 'p33', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p43', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p44', 2.12132034356, true, false, false);
    builder.addCircleArc('#7f007f', 'p34', 2.12132034356, true, false, true);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAI');

    builder.addHarder('ACC');

    builder.addLocalMap('<image src="images/map_AAO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAI" alt="AAI">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAO" alt="AAO">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACC" alt="ACC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGC.puz
function AGC()
{
    var builder = new PuzzleBuilder('AGC');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6], [7, 8]]);
    builder.addPermutation('#ffff00', [[1, 2], [3, 4], [6, 7], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFU');

    builder.addHarder('AGD');
    builder.addHarder('AGE');
    builder.addHarder('AGF');
    builder.addHarder('AGH');

    builder.addLocalMap('<image src="images/map_AGC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=AFU" alt="AFU">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AGC" alt="AGC">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AGD" alt="AGD">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=AGE" alt="AGE">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=AGF" alt="AGF">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AGH" alt="AGH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHX.puz
function AHX()
{
    var builder = new PuzzleBuilder('AHX');

    builder.addNode('q0', '#ff7f00', '10', 3, 2);
    builder.addNode('q1', '#00ff00', '22', 4, 3);
    builder.addNode('q2', '#0000ff', '6', 3, 4);
    builder.addNode('q3', '#ff00ff', '4', 2, 3);
    builder.addNode('q4', '#ff0000', '13', 1, 1);
    builder.addNode('q5', '#ff7f00', '10', 3, 0);
    builder.addNode('q6', '#ffff00', '0', 5, 1);
    builder.addNode('q7', '#00ff00', '22', 6, 3);
    builder.addNode('q8', '#00ffff', '17', 5, 5);
    builder.addNode('q9', '#0000ff', '6', 3, 6);
    builder.addNode('q10', '#7f007f', '8', 1, 5);
    builder.addNode('q11', '#ff00ff', '4', 0, 3);
    builder.addPermutation('#ff0000', [[0, 4, 5, 6]]);
    builder.addPermutation('#ffff00', [[1, 6, 7, 8]]);
    builder.addPermutation('#00ff00', [[2, 8, 9, 10]]);
    builder.addPermutation('#0000ff', [[3, 10, 11, 4]]);
    builder.addPermutation('#7f007f', [[0, 1, 2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABW');

    builder.addHarder('AHY');

    builder.addLocalMap('<image src="images/map_AHX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABW" alt="ABW">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AHX" alt="AHX">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHY" alt="AHY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACB.puz
function ACB()
{
    var builder = new PuzzleBuilder('ACB');

    builder.addNode('p1', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#ff0000', '13', -1.0000, 1.7321);
    builder.addNode('p4', '#ffff00', '0', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', '13', -1.0000, -1.7321);
    builder.addNode('p6', '#ffff00', '0', 1.0000, -1.7321);
    builder.addNode('p7', '#00ff00', '22', 4.0000, 0.0000);
    builder.addNode('p8', '#00ffff', '17', 2.0000, 3.4641);
    builder.addNode('p9', '#00ff00', '22', -2.0000, 3.4641);
    builder.addNode('p10', '#00ffff', '17', -4.0000, 0.0000);
    builder.addNode('p11', '#00ff00', '22', -2.0000, -3.4641);
    builder.addNode('p12', '#00ffff', '17', 2.0000, -3.4641);
    builder.addNode('p13', '#0000ff', '6', 6.0000, 0.0000);
    builder.addNode('p14', '#7f007f', '8', 3.0000, 5.1962);
    builder.addNode('p15', '#0000ff', '6', -3.0000, 5.1962);
    builder.addNode('p16', '#7f007f', '8', -6.0000, 0.0000);
    builder.addNode('p17', '#0000ff', '6', -3.0000, -5.1962);
    builder.addNode('p18', '#7f007f', '8', 3.0000, -5.1962);
    builder.addPermutation('#ff0000', [[0, 7, 2, 15, 4, 5], [6, 13, 14, 9, 10, 11, 12, 1, 8, 3, 16, 17]]);
    builder.addPermutation('#00ff00', [[6, 12], [7, 13], [8, 14], [9, 15], [10, 16], [11, 17]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACC');

    builder.addLocalMap('<image src="images/map_ACB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ACB" alt="ACB">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ACC" alt="ACC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIB.puz
function AIB()
{
    var builder = new PuzzleBuilder('AIB');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ff0000', '13', 0.3090, 0.9511);
    builder.addNode('p2', '#ff0000', '13', -0.8090, 0.5878);
    builder.addNode('p3', '#ff0000', '13', -0.8090, -0.5878);
    builder.addNode('p4', '#ff0000', '13', 0.3090, -0.9511);
    builder.addNode('p5', '#ffff00', '0', 2.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', 0.6180, 1.9021);
    builder.addNode('p7', '#ffff00', '0', -1.6180, 1.1756);
    builder.addNode('p8', '#ffff00', '0', -1.6180, -1.1756);
    builder.addNode('p9', '#ffff00', '0', 0.6180, -1.9021);
    builder.addNode('p10', '#00ff00', '22', -3.0000, 0.0000);
    builder.addNode('p11', '#00ff00', '22', -0.9271, -2.8532);
    builder.addNode('p12', '#00ff00', '22', 2.4271, -1.7634);
    builder.addNode('p13', '#00ff00', '22', 2.4271, 1.7634);
    builder.addNode('p14', '#00ff00', '22', -0.9271, 2.8532);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [2, 7], [5, 13], [6, 14], [8, 10], [9, 12]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 2], [3, 8], [5, 12], [6, 13], [7, 14], [9, 11]]);
    builder.addPermutation('#0000ff', [[0, 5], [1, 6], [2, 3], [4, 9], [7, 10], [8, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AID');

    builder.addHarder('AHZ');

    builder.addLocalMap('<image src="images/map_AIB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHZ" alt="AHZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AIB" alt="AIB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AID" alt="AID">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFG.puz
function AFG()
{
    var builder = new PuzzleBuilder('AFG');

    builder.addNode('lhs', '#ff0000', '13', 1, 4);
    builder.addNode('mid', '#ffff00', '0', 4, 4);
    builder.addNode('rhs', '#0000ff', '6', 4, 1);
    builder.addNode('top', '#7f007f', '8', 7, 7);
    builder.addNode('bot', '#00ff00', '22', 1, 7);
    builder.addNode('six', '#00ffff', '17', 1, 1);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2], [0, 5]]);
    builder.addPermutation('#00ff00', [[1, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACP');
    builder.addEasier('AFE');

    builder.addLocalMap('<image src="images/map_AFG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ACP" alt="ACP">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AFE" alt="AFE">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AFG" alt="AFG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABH.puz
function ABH()
{
    var builder = new PuzzleBuilder('ABH');

    builder.addNode('r1c2', '#ff0000', '13', 4, 1);
    builder.addNode('r1c4', '#ff0000', '13', 10, 1);
    builder.addNode('r2c1', '#ffff00', '0', 1, 4);
    builder.addNode('r2c3', '#ffff00', '0', 7, 4);
    builder.addNode('r2c5', '#ffff00', '0', 13, 4);
    builder.addNode('r3c2', '#00ff00', '22', 4, 7);
    builder.addNode('r3c4', '#00ff00', '22', 10, 7);
    builder.addNode('r4c3', '#0000ff', '6', 7, 10);
    builder.addNode('r4c5', '#0000ff', '6', 13, 10);
    builder.addNode('r5c4', '#7f007f', '8', 10, 13);
    builder.addPermutation('#ff0000', [[2, 0, 3, 5], [7, 6, 8, 9]]);
    builder.addPermutation('#0000ff', [[3, 1, 4, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEL');

    builder.addHarder('AAV');
    builder.addHarder('ABI');

    builder.addLocalMap('<image src="images/map_ABH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAV" alt="AAV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABH" alt="ABH">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABI" alt="ABI">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEL" alt="AEL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEB.puz
function AEB()
{
    var builder = new PuzzleBuilder('AEB');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 1.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', 1.0000, 1.7321);
    builder.addNode('p4', '#0000ff', '6', 1.5000, 2.5981);
    builder.addNode('p5', '#7f007f', '8', 2.5000, 2.5981);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADZ');
    builder.addEasier('AEQ');
    builder.addEasier('AFJ');
    builder.addEasier('AFK');

    builder.addLocalMap('<image src="images/map_AEB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,-4.54545454545,504.545454545,95.4545454545" href="index.html?puzzle=ADZ" alt="ADZ">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AEB" alt="AEB">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,-4.54545454545,95.4545454545,95.4545454545" href="index.html?puzzle=AEQ" alt="AEQ">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,-4.54545454545,231.818181818,95.4545454545" href="index.html?puzzle=AFJ" alt="AFJ">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,-4.54545454545,368.181818182,95.4545454545" href="index.html?puzzle=AFK" alt="AFK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHE.puz
function AHE()
{
    var builder = new PuzzleBuilder('AHE');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#0000ff', '6', 1, 2);
    builder.addNode('p21', '#0000ff', '6', 2, 1);
    builder.addNode('p22', '#7f007f', '8', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p32', '#0000ff', '6', 3, 2);
    builder.addNode('p33', '#00ff00', '22', 3, 3);
    builder.addNode('p34', '#ffff00', '0', 3, 4);
    builder.addNode('p43', '#ffff00', '0', 4, 3);
    builder.addNode('p44', '#ff0000', '13', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [6, 7], [8, 9]]);
    builder.addPermutation('#ffff00', [[3, 4], [5, 6], [9, 10], [11, 12]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [6, 8], [7, 9]]);
    builder.addPermutation('#0000ff', [[3, 5], [4, 6], [9, 11], [10, 12]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHD');

    builder.addHarder('AHF');

    builder.addLocalMap('<image src="images/map_AHE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AHD" alt="AHD">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AHE" alt="AHE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHF" alt="AHF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACG.puz
function ACG()
{
    var builder = new PuzzleBuilder('ACG');

    builder.addNode('p1', '#00ff00', '22', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#ffff00', '0', -1.0000, 1.7321);
    builder.addNode('p4', '#00ff00', '22', -2.0000, 0.0000);
    builder.addNode('p5', '#00ffff', '17', -1.0000, -1.7321);
    builder.addNode('p6', '#00ffff', '17', 1.0000, -1.7321);
    builder.addNode('p7', '#00ff00', '22', 5.0000, 0.0000);
    builder.addNode('p8', '#ff7f00', '10', 2.5000, 4.3301);
    builder.addNode('p9', '#ff7f00', '10', -2.5000, 4.3301);
    builder.addNode('p10', '#00ff00', '22', -5.0000, 0.0000);
    builder.addNode('p11', '#0000ff', '6', -2.5000, -4.3301);
    builder.addNode('p12', '#0000ff', '6', 2.5000, -4.3301);
    builder.addNode('p13', '#ffff00', '0', 6.0000, 1.7321);
    builder.addNode('p14', '#ff7f00', '10', 4.5000, 4.3301);
    builder.addNode('p15', '#ff0000', '13', 1.5000, 6.0622);
    builder.addNode('p16', '#ff0000', '13', -1.5000, 6.0622);
    builder.addNode('p17', '#ff7f00', '10', -4.5000, 4.3301);
    builder.addNode('p18', '#ffff00', '0', -6.0000, 1.7321);
    builder.addNode('p19', '#00ffff', '17', -6.0000, -1.7321);
    builder.addNode('p20', '#0000ff', '6', -4.5000, -4.3301);
    builder.addNode('p21', '#7f007f', '8', -1.5000, -6.0622);
    builder.addNode('p22', '#7f007f', '8', 1.5000, -6.0622);
    builder.addNode('p23', '#0000ff', '6', 4.5000, -4.3301);
    builder.addNode('p24', '#00ffff', '17', 6.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 2, 4], [1, 5, 3], [6, 23, 12], [7, 14, 13], [8, 15, 16], [9, 18, 17], [10, 19, 20], [11, 22, 21]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23]]);
    builder.addCircleArc('#0000ff', 'p1', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p4', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p13', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p15', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p16', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p17', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p18', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p19', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p20', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p21', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p22', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p23', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p24', 4.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIH');

    builder.addHarder('ACH');
    builder.addHarder('ACI');

    builder.addLocalMap('<image src="images/map_ACG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACG" alt="ACG">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ACH" alt="ACH">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ACI" alt="ACI">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AIH" alt="AIH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAB.puz
function AAB()
{
    var builder = new PuzzleBuilder('AAB');

    builder.addNode('lhs', '#ff0000', '13', 1, 1);
    builder.addNode('rhs', '#00ff00', '22', 4, 1);
    builder.addNode('bot', '#0000ff', '6', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[1, 2]]);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'bot', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAA');

    builder.addHarder('AAC');
    builder.addHarder('AAF');
    builder.addHarder('AAR');
    builder.addHarder('ADB');

    builder.addLocalMap('<image src="images/map_AAB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=AAA" alt="AAA">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AAB" alt="AAB">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AAC" alt="AAC">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=AAF" alt="AAF">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=AAR" alt="AAR">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=ADB" alt="ADB">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEA.puz
function AEA()
{
    var builder = new PuzzleBuilder('AEA');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', 1, 1);
    builder.addNode('p3', '#00ffff', '17', 0, 1);
    builder.addNode('p4', '#0000ff', '6', 0, 2);
    builder.addNode('p5', '#7f007f', '8', 1, 2);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEC');
    builder.addEasier('AES');

    builder.addHarder('AAW');
    builder.addHarder('AEE');

    builder.addLocalMap('<image src="images/map_AEA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AAW" alt="AAW">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEA" alt="AEA">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AEC" alt="AEC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEE" alt="AEE">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AES" alt="AES">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEU.puz
function AEU()
{
    var builder = new PuzzleBuilder('AEU');

    builder.addNode('lhs', '#ff0000', '13', -0.5000, 0.8660);
    builder.addNode('mid', '#ffff00', '0', 0, 0);
    builder.addNode('rhs', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('top', '#7f007f', '8', 1.5000, 0.8660);
    builder.addNode('bot', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('six', '#00ffff', '17', 1.0000, 1.7321);
    builder.addPermutation('#ff0000', [[0, 1], [5, 3]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[1, 4], [2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEV');
    builder.addEasier('AEW');

    builder.addHarder('AAP');

    builder.addLocalMap('<image src="images/map_AEU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEU" alt="AEU">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEV" alt="AEV">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AEW" alt="AEW">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIK.puz
function AIK()
{
    var builder = new PuzzleBuilder('AIK');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p2', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p3', '#ff0000', '13', 1.5000, -0.8660);
    builder.addNode('p4', '#ff0000', '13', 0.5000, -0.8660);
    builder.addNode('p5', '#00ff00', '22', 0.0000, 1.7321);
    builder.addNode('p6', '#00ff00', '22', 0.5000, 0.8660);
    builder.addNode('p7', '#0000ff', '6', -1.5000, -0.8660);
    builder.addNode('p8', '#0000ff', '6', -1.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 3, 4]]);
    builder.addPermutation('#ffff00', [[1, 5, 6]]);
    builder.addPermutation('#00ff00', [[2, 7, 8]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 8], [2, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIJ');
    builder.addEasier('AIM');

    builder.addHarder('AII');

    builder.addLocalMap('<image src="images/map_AIK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AII" alt="AII">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AIJ" alt="AIJ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AIK" alt="AIK">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AIM" alt="AIM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFC.puz
function AFC()
{
    var builder = new PuzzleBuilder('AFC');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', 0.0000, 1.7321);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', -1.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#ffff00', [[0, 2]]);
    builder.addPermutation('#0000ff', [[0, 4], [2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEZ');
    builder.addEasier('AFH');

    builder.addHarder('ABT');

    builder.addLocalMap('<image src="images/map_AFC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ABT" alt="ABT">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEZ" alt="AEZ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFC" alt="AFC">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AFH" alt="AFH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEM.puz
function AEM()
{
    var builder = new PuzzleBuilder('AEM');

    builder.addNode('lhs', '#ff0000', '13', 1, 4);
    builder.addNode('mid', '#ffff00', '0', 4, 4);
    builder.addNode('rhs', '#0000ff', '6', 1, 7);
    builder.addNode('top', '#7f007f', '8', 1, 1);
    builder.addNode('bot', '#00ff00', '22', 4, 7);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[1, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAC');

    builder.addHarder('AFE');
    builder.addHarder('AFF');

    builder.addLocalMap('<image src="images/map_AEM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAC" alt="AAC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEM" alt="AEM">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AFE" alt="AFE">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AFF" alt="AFF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGQ.puz
function AGQ()
{
    var builder = new PuzzleBuilder('AGQ');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#00ffff', '17', 2, 2);
    builder.addNode('p23', '#0000ff', '6', 2, 3);
    builder.addNode('p30', '#00ff00', '22', 3, 0);
    builder.addNode('p31', '#00ffff', '17', 3, 1);
    builder.addNode('p32', '#0000ff', '6', 3, 2);
    builder.addNode('p33', '#7f007f', '8', 3, 3);
    builder.addPermutation('#ff0000', [[4, 5], [6, 7], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[0, 1], [2, 3], [5, 6], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [4, 8], [5, 9], [6, 10], [7, 11]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGH');

    builder.addLocalMap('<image src="images/map_AGQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGH" alt="AGH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGQ" alt="AGQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGG.puz
function AGG()
{
    var builder = new PuzzleBuilder('AGG');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5], [8, 9]]);
    builder.addPermutation('#ffff00', [[3, 4], [7, 8], [1, 2], [5, 6]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 6]]);
    builder.addPermutation('#0000ff', [[3, 7], [4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGB');

    builder.addHarder('AGI');

    builder.addLocalMap('<image src="images/map_AGG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGB" alt="AGB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGG" alt="AGG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGI" alt="AGI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACM.puz
function ACM()
{
    var builder = new PuzzleBuilder('ACM');

    builder.addNode('p1', '#7f007f', '8', 6.0000, 10.3923);
    builder.addNode('p2', '#7f007f', '8', 13.0000, 10.3923);
    builder.addNode('p3', '#0000ff', '6', 9.5000, 7.7942);
    builder.addNode('p4', '#0000ff', '6', 11.5000, 7.7942);
    builder.addNode('p5', '#00ffff', '17', 4.0000, 6.9282);
    builder.addNode('p6', '#00ffff', '17', 9.0000, 6.9282);
    builder.addNode('p7', '#0000ff', '6', 10.0000, 6.9282);
    builder.addNode('p8', '#0000ff', '6', 11.0000, 6.9282);
    builder.addNode('p9', '#00ffff', '17', 9.5000, 6.0622);
    builder.addNode('p10', '#00ffff', '17', 10.5000, 6.0622);
    builder.addNode('p11', '#0000ff', '6', 11.5000, 6.0622);
    builder.addNode('p12', '#0000ff', '6', 12.5000, 6.0622);
    builder.addNode('p13', '#7f007f', '8', 15.5000, 6.0622);
    builder.addNode('p14', '#00ffff', '17', 5.0000, 5.1962);
    builder.addNode('p15', '#00ffff', '17', 6.0000, 5.1962);
    builder.addNode('p16', '#00ffff', '17', 11.0000, 5.1962);
    builder.addNode('p17', '#00ffff', '17', 12.0000, 5.1962);
    builder.addNode('p18', '#00ffff', '17', 6.5000, 4.3301);
    builder.addNode('p19', '#00ffff', '17', 9.5000, 4.3301);
    builder.addNode('p20', '#ffff00', '0', 4.0000, 3.4641);
    builder.addNode('p21', '#ffff00', '0', 5.0000, 3.4641);
    builder.addNode('p22', '#00ff00', '22', 6.0000, 3.4641);
    builder.addNode('p23', '#00ff00', '22', 9.0000, 3.4641);
    builder.addNode('p24', '#00ffff', '17', 10.5000, 2.5981);
    builder.addNode('p25', '#00ffff', '17', 13.5000, 2.5981);
    builder.addNode('p26', '#ffff00', '0', 5.0000, 1.7321);
    builder.addNode('p27', '#ffff00', '0', 6.0000, 1.7321);
    builder.addNode('p28', '#00ff00', '22', 7.0000, 1.7321);
    builder.addNode('p29', '#00ff00', '22', 10.0000, 1.7321);
    builder.addNode('p30', '#ff0000', '13', 4.5000, 0.8660);
    builder.addNode('p31', '#ff0000', '13', 5.5000, 0.8660);
    builder.addNode('p32', '#ff0000', '13', 5.0000, 0.0000);
    builder.addNode('p33', '#ff0000', '13', 6.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 3], [2, 5], [6, 8], [7, 9], [10, 15], [11, 16], [12, 24], [13, 19], [14, 20], [17, 21], [18, 22], [23, 28], [25, 29], [26, 30], [27, 32]]);
    builder.addPermutation('#0000ff', [[1, 12], [2, 6], [3, 11], [4, 13], [5, 8], [7, 10], [9, 15], [14, 17], [16, 24], [18, 23], [19, 25], [20, 26], [21, 27], [22, 28], [29, 31], [30, 32]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABB');
    builder.addEasier('ACW');
    builder.addEasier('ADM');

    builder.addLocalMap('<image src="images/map_ACM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="12.5,12.5,112.5,112.5" href="index.html?puzzle=ABB" alt="ABB">');
    builder.addLocalMap('<area shape="rect" coords="200.0,262.5,300.0,362.5" href="index.html?puzzle=ACM" alt="ACM">');
    builder.addLocalMap('<area shape="rect" coords="387.5,12.5,487.5,112.5" href="index.html?puzzle=ACW" alt="ACW">');
    builder.addLocalMap('<area shape="rect" coords="200.0,12.5,300.0,112.5" href="index.html?puzzle=ADM" alt="ADM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAN.puz
function AAN()
{
    var builder = new PuzzleBuilder('AAN');

    builder.addNode('coord12', '#ff0000', '13', 1, 4);
    builder.addNode('coord13', '#ffff00', '0', 1, 7);
    builder.addNode('coord21', '#00ff00', '22', 4, 1);
    builder.addNode('coord24', '#0000ff', '6', 4, 10);
    builder.addNode('coord31', '#7f007f', '8', 7, 1);
    builder.addNode('coord34', '#00ffff', '17', 7, 10);
    builder.addNode('coord42', '#d01f90', '12', 10, 4);
    builder.addNode('coord43', '#ff00ff', '4', 10, 7);
    builder.addPermutation('#7f007f', [[2, 4, 6, 7, 5, 3, 1, 0]]);
    builder.addPermutation('#ffff00', [[0, 6]]);
    builder.addPermutation('#00ffff', [[2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAH');

    builder.addHarder('ACK');

    builder.addLocalMap('<image src="images/map_AAN.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AAH" alt="AAH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AAN" alt="AAN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACK" alt="ACK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACF.puz
function ACF()
{
    var builder = new PuzzleBuilder('ACF');

    builder.addNode('p1', '#ffffff', '11', -2.0000, -0.0000);
    builder.addNode('p2', '#ffffff', '11', -4.0000, -0.0000);
    builder.addNode('p3', '#ffffff', '11', -6.0000, -0.0000);
    builder.addNode('p4', '#ffffff', '11', 1.0000, 1.7321);
    builder.addNode('p5', '#ffffff', '11', 2.0000, 3.4641);
    builder.addNode('p6', '#ffffff', '11', 3.0000, 5.1962);
    builder.addNode('p7', '#ffffff', '11', 1.0000, -1.7321);
    builder.addNode('p8', '#ffffff', '11', 2.0000, -3.4641);
    builder.addNode('p9', '#ffffff', '11', 3.0000, -5.1962);
    builder.addNode('p10', '#ff0000', '13', -9.0000, -1.7321);
    builder.addNode('p11', '#ff0000', '13', -10.0000, -3.4641);
    builder.addNode('p12', '#ff0000', '13', -11.0000, -5.1962);
    builder.addNode('p13', '#ff0000', '13', -9.0000, 1.7321);
    builder.addNode('p14', '#ff0000', '13', -10.0000, 3.4641);
    builder.addNode('p15', '#ff0000', '13', -11.0000, 5.1962);
    builder.addNode('p16', '#00ff00', '22', 3.0000, 8.6603);
    builder.addNode('p17', '#00ff00', '22', 2.0000, 10.3923);
    builder.addNode('p18', '#00ff00', '22', 1.0000, 12.1244);
    builder.addNode('p19', '#00ff00', '22', 6.0000, 6.9282);
    builder.addNode('p20', '#00ff00', '22', 8.0000, 6.9282);
    builder.addNode('p21', '#00ff00', '22', 10.0000, 6.9282);
    builder.addNode('p22', '#0000ff', '6', 6.0000, -6.9282);
    builder.addNode('p23', '#0000ff', '6', 8.0000, -6.9282);
    builder.addNode('p24', '#0000ff', '6', 10.0000, -6.9282);
    builder.addNode('p25', '#0000ff', '6', 3.0000, -8.6603);
    builder.addNode('p26', '#0000ff', '6', 2.0000, -10.3923);
    builder.addNode('p27', '#0000ff', '6', 1.0000, -12.1244);
    builder.addPermutation('#ff0000', [[0, 9, 13], [1, 11, 12], [2, 10, 14]]);
    builder.addPermutation('#00ff00', [[3, 15, 19], [4, 17, 18], [5, 16, 20]]);
    builder.addPermutation('#0000ff', [[6, 21, 25], [7, 23, 24], [8, 22, 26]]);
    builder.addPermutation('#ffff00', [[0, 4, 8], [1, 5, 6], [2, 3, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACE');

    builder.addLocalMap('<image src="images/map_ACF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ACE" alt="ACE">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ACF" alt="ACF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEH.puz
function AEH()
{
    var builder = new PuzzleBuilder('AEH');

    builder.addNode('p12', '#ff0000', '13', 1, 4);
    builder.addNode('p13', '#ffff00', '0', 1, 7);
    builder.addNode('p21', '#00ff00', '22', 4, 1);
    builder.addNode('p24', '#0000ff', '6', 4, 10);
    builder.addNode('p31', '#7f007f', '8', 7, 1);
    builder.addNode('p34', '#00ffff', '17', 7, 10);
    builder.addNode('p42', '#d01f90', '12', 10, 4);
    builder.addNode('p43', '#ff00ff', '4', 10, 7);
    builder.addPermutation('#ff0000', [[2, 4], [6, 7], [5, 3], [1, 0]]);
    builder.addPermutation('#0000ff', [[4, 6], [7, 5], [3, 1], [0, 2]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACU');

    builder.addHarder('AEI');

    builder.addLocalMap('<image src="images/map_AEH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ACU" alt="ACU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AEH" alt="AEH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AEI" alt="AEI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAM.puz
function AAM()
{
    var builder = new PuzzleBuilder('AAM');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#0000ff', '6', -0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#00ff00', [[0, 2, 3]]);
    builder.addPermutation('#0000ff', [[0, 3, 1]]);
    builder.addCircleArc('#ff0000', 'p0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'p1', 1, false, false, true);
    builder.addCircleArc('#ff0000', 'p2', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'p0', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'p2', 1, false, false, true);
    builder.addCircleArc('#00ff00', 'p3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'p0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'p3', 1, false, false, true);
    builder.addCircleArc('#0000ff', 'p1', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAF');

    builder.addHarder('AAQ');
    builder.addHarder('AAX');
    builder.addHarder('ABE');

    builder.addLocalMap('<image src="images/map_AAM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AAF" alt="AAF">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AAM" alt="AAM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAQ" alt="AAQ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AAX" alt="AAX">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ABE" alt="ABE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGF.puz
function AGF()
{
    var builder = new PuzzleBuilder('AGF');

    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[2, 3], [6, 7], [0, 1], [4, 5], [8, 9]]);
    builder.addPermutation('#ffff00', [[3, 4], [7, 8]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5]]);
    builder.addPermutation('#0000ff', [[2, 6], [3, 7], [4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGC');

    builder.addLocalMap('<image src="images/map_AGF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGC" alt="AGC">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGF" alt="AGF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AIC.puz
function AIC()
{
    var builder = new PuzzleBuilder('AIC');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.3090, 0.9511);
    builder.addNode('p2', '#00ff00', '22', -0.8090, 0.5878);
    builder.addNode('p3', '#0000ff', '6', -0.8090, -0.5878);
    builder.addNode('p4', '#7f007f', '8', 0.3090, -0.9511);
    builder.addNode('p5', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p6', '#ffff00', '0', 0.6180, 1.9021);
    builder.addNode('p7', '#00ff00', '22', -1.6180, 1.1756);
    builder.addNode('p8', '#0000ff', '6', -1.6180, -1.1756);
    builder.addNode('p9', '#7f007f', '8', 0.6180, -1.9021);
    builder.addNode('p10', '#ff0000', '13', -3.0000, 0.0000);
    builder.addNode('p11', '#ffff00', '0', -0.9271, -2.8532);
    builder.addNode('p12', '#00ff00', '22', 2.4271, -1.7634);
    builder.addNode('p13', '#0000ff', '6', 2.4271, 1.7634);
    builder.addNode('p14', '#7f007f', '8', -0.9271, 2.8532);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [2, 7], [5, 13], [6, 14], [8, 10], [9, 12]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 2], [3, 8], [5, 12], [6, 13], [7, 14], [9, 11]]);
    builder.addPermutation('#0000ff', [[0, 5], [1, 6], [2, 3], [4, 9], [7, 10], [8, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AIE');

    builder.addHarder('AIA');

    builder.addLocalMap('<image src="images/map_AIC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AIA" alt="AIA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AIC" alt="AIC">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AIE" alt="AIE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHH.puz
function AHH()
{
    var builder = new PuzzleBuilder('AHH');

    builder.addNode('s1r1c1', '#ff0000', '13', 1, 4);
    builder.addNode('s1r1c2', '#ff0000', '13', 1, 5);
    builder.addNode('s1r1c3', '#ff0000', '13', 1, 6);
    builder.addNode('s1r2c1', '#ff0000', '13', 2, 4);
    builder.addNode('s1r2c2', '#ff0000', '13', 2, 5);
    builder.addNode('s1r2c3', '#ff0000', '13', 2, 6);
    builder.addNode('s1r3c1', '#ff0000', '13', 3, 4);
    builder.addNode('s1r3c2', '#ff0000', '13', 3, 5);
    builder.addNode('s1r3c3', '#ff0000', '13', 3, 6);
    builder.addNode('s2r1c1', '#0000ff', '6', 4, 7);
    builder.addNode('s2r1c2', '#0000ff', '6', 4, 8);
    builder.addNode('s2r1c3', '#0000ff', '6', 4, 9);
    builder.addNode('s2r2c1', '#0000ff', '6', 5, 7);
    builder.addNode('s2r2c2', '#0000ff', '6', 5, 8);
    builder.addNode('s2r2c3', '#0000ff', '6', 5, 9);
    builder.addNode('s2r3c1', '#0000ff', '6', 6, 7);
    builder.addNode('s2r3c2', '#0000ff', '6', 6, 8);
    builder.addNode('s2r3c3', '#0000ff', '6', 6, 9);
    builder.addNode('s3r1c1', '#00ff00', '22', 7, 4);
    builder.addNode('s3r1c2', '#00ff00', '22', 7, 5);
    builder.addNode('s3r1c3', '#00ff00', '22', 7, 6);
    builder.addNode('s3r2c1', '#00ff00', '22', 8, 4);
    builder.addNode('s3r2c2', '#00ff00', '22', 8, 5);
    builder.addNode('s3r2c3', '#00ff00', '22', 8, 6);
    builder.addNode('s3r3c1', '#00ff00', '22', 9, 4);
    builder.addNode('s3r3c2', '#00ff00', '22', 9, 5);
    builder.addNode('s3r3c3', '#00ff00', '22', 9, 6);
    builder.addNode('s4r1c1', '#ffff00', '0', 4, 1);
    builder.addNode('s4r1c2', '#ffff00', '0', 4, 2);
    builder.addNode('s4r1c3', '#ffff00', '0', 4, 3);
    builder.addNode('s4r2c1', '#ffff00', '0', 5, 1);
    builder.addNode('s4r2c2', '#ffff00', '0', 5, 2);
    builder.addNode('s4r2c3', '#ffff00', '0', 5, 3);
    builder.addNode('s4r3c1', '#ffff00', '0', 6, 1);
    builder.addNode('s4r3c2', '#ffff00', '0', 6, 2);
    builder.addNode('s4r3c3', '#ffff00', '0', 6, 3);
    builder.addPermutation('#ff0000', [[0, 11, 26, 33], [1, 14, 25, 30], [2, 17, 24, 27]]);
    builder.addPermutation('#0000ff', [[3, 10, 23, 34], [4, 13, 22, 31], [5, 16, 21, 28]]);
    builder.addPermutation('#00ff00', [[6, 9, 20, 35], [7, 12, 19, 32], [8, 15, 18, 29]]);
    builder.addPermutation('#ff00ff', [[0, 18], [3, 21], [6, 24]]);
    builder.addPermutation('#00ffff', [[1, 19], [4, 22], [7, 25]]);
    builder.addPermutation('#ffff00', [[2, 20], [5, 23], [8, 26]]);
    builder.addPermutation('#7f007f', [[27, 9], [28, 10], [29, 11]]);
    builder.addPermutation('#ff7f00', [[30, 12], [31, 13], [32, 14]]);
    builder.addPermutation('#7f7f7f', [[33, 15], [34, 16], [35, 17]]);
    builder.addCircleArc('#ff0000', 's1r1c1', 4.12310562562, false, true, false);
    builder.addCircleArc('#ff0000', 's2r1c3', 4.12310562562, false, false, false);
    builder.addCircleArc('#ff0000', 's3r3c3', 4.12310562562, false, false, false);
    builder.addCircleArc('#ff0000', 's4r3c1', 4.12310562562, false, false, false);
    builder.addCircleArc('#ff0000', 's1r1c2', 4.0, false, true, false);
    builder.addCircleArc('#ff0000', 's2r2c3', 4.0, false, false, false);
    builder.addCircleArc('#ff0000', 's3r3c2', 4.0, false, false, false);
    builder.addCircleArc('#ff0000', 's4r2c1', 4.0, false, true, false);
    builder.addCircleArc('#ff0000', 's1r1c3', 4.12310562562, false, false, false);
    builder.addCircleArc('#ff0000', 's2r3c3', 4.12310562562, false, false, false);
    builder.addCircleArc('#ff0000', 's3r3c1', 4.12310562562, false, false, false);
    builder.addCircleArc('#ff0000', 's4r1c1', 4.12310562562, false, true, false);
    builder.addCircleArc('#0000ff', 's1r2c1', 3.16227766017, false, true, false);
    builder.addCircleArc('#0000ff', 's2r1c2', 3.16227766017, false, false, false);
    builder.addCircleArc('#0000ff', 's3r2c3', 3.16227766017, false, false, false);
    builder.addCircleArc('#0000ff', 's4r3c2', 3.16227766017, false, false, false);
    builder.addCircleArc('#0000ff', 's1r2c2', 3.0, false, true, false);
    builder.addCircleArc('#0000ff', 's2r2c2', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 's3r2c2', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 's4r2c2', 3.0, false, true, false);
    builder.addCircleArc('#0000ff', 's1r2c3', 3.16227766017, false, false, false);
    builder.addCircleArc('#0000ff', 's2r3c2', 3.16227766017, false, false, false);
    builder.addCircleArc('#0000ff', 's3r2c1', 3.16227766017, false, false, false);
    builder.addCircleArc('#0000ff', 's4r1c2', 3.16227766017, false, true, false);
    builder.addCircleArc('#00ff00', 's1r3c1', 2.2360679775, false, true, false);
    builder.addCircleArc('#00ff00', 's2r1c1', 2.2360679775, false, false, false);
    builder.addCircleArc('#00ff00', 's3r1c3', 2.2360679775, false, false, false);
    builder.addCircleArc('#00ff00', 's4r3c3', 2.2360679775, false, false, false);
    builder.addCircleArc('#00ff00', 's1r3c2', 2.0, false, true, false);
    builder.addCircleArc('#00ff00', 's2r2c1', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 's3r1c2', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 's4r2c3', 2.0, false, true, false);
    builder.addCircleArc('#00ff00', 's1r3c3', 2.2360679775, false, false, false);
    builder.addCircleArc('#00ff00', 's2r3c1', 2.2360679775, false, false, false);
    builder.addCircleArc('#00ff00', 's3r1c1', 2.2360679775, false, false, false);
    builder.addCircleArc('#00ff00', 's4r1c3', 2.2360679775, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHY');

    builder.addLocalMap('<image src="images/map_AHH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AHH" alt="AHH">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AHY" alt="AHY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAP.puz
function AAP()
{
    var builder = new PuzzleBuilder('AAP');

    builder.addNode('coord11', '#ff0000', '13', -0.5000, 0.8660);
    builder.addNode('coord12', '#ffff00', '0', 0, 0);
    builder.addNode('coord13', '#00ff00', '22', -0.5000, -0.8660);
    builder.addNode('coord22', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('coord31', '#7f007f', '8', 2.5000, -0.8660);
    builder.addNode('coord32', '#00ffff', '17', 1.5000, -0.8660);
    builder.addNode('coord33', '#ff00ff', '4', 1.0000, -1.7321);
    builder.addPermutation('#ffff00', [[1, 3], [4, 5]]);
    builder.addPermutation('#00ff00', [[1, 2], [5, 6]]);
    builder.addPermutation('#0000ff', [[0, 1], [3, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAD');
    builder.addEasier('ACR');
    builder.addEasier('ADZ');
    builder.addEasier('AEN');
    builder.addEasier('AEU');

    builder.addHarder('AAL');

    builder.addLocalMap('<image src="images/map_AAP.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="-14.2857142857,-14.2857142857,85.7142857143,85.7142857143" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="253.571428571,271.428571429,353.571428571,371.428571429" href="index.html?puzzle=AAL" alt="AAL">');
    builder.addLocalMap('<area shape="rect" coords="253.571428571,128.571428571,353.571428571,228.571428571" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="307.142857143,-14.2857142857,407.142857143,85.7142857143" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-14.2857142857,300.0,85.7142857143" href="index.html?puzzle=ADZ" alt="ADZ">');
    builder.addLocalMap('<area shape="rect" coords="414.285714286,-14.2857142857,514.285714286,85.7142857143" href="index.html?puzzle=AEN" alt="AEN">');
    builder.addLocalMap('<area shape="rect" coords="92.8571428571,-14.2857142857,192.857142857,85.7142857143" href="index.html?puzzle=AEU" alt="AEU">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAF.puz
function AAF()
{
    var builder = new PuzzleBuilder('AAF');

    builder.addNode('ul', '#ff0000', '13', 1, 1);
    builder.addNode('ur', '#ffff00', '0', 4, 1);
    builder.addNode('bl', '#0000ff', '6', 1, 4);
    builder.addNode('br', '#00ff00', '22', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[1, 3, 2]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 4.0, true, false, false);
    builder.addCircleArc('#ff0000', 'bl', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'br', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'bl', 4.0, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADA');
    builder.addEasier('AAB');

    builder.addHarder('AAM');
    builder.addHarder('ABK');
    builder.addHarder('AIG');

    builder.addLocalMap('<image src="images/map_AAF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAB" alt="AAB">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AAF" alt="AAF">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAM" alt="AAM">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ABK" alt="ABK">');
    builder.addLocalMap('<area shape="rect" coords="225.0,0.0,325.0,100.0" href="index.html?puzzle=ADA" alt="ADA">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AIG" alt="AIG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFK.puz
function AFK()
{
    var builder = new PuzzleBuilder('AFK');

    builder.addNode('p0', '#ff0000', '13', 0, 1);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', 1, 1);
    builder.addNode('p3', '#00ffff', '17', 2, 1);
    builder.addNode('p4', '#0000ff', '6', 2, 0);
    builder.addNode('p5', '#7f007f', '8', 3, 1);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);
    builder.addPermutation('#7f007f', [[4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEO');

    builder.addHarder('AEB');
    builder.addHarder('AES');

    builder.addLocalMap('<image src="images/map_AFK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEB" alt="AEB">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AEO" alt="AEO">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AES" alt="AES">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AFK" alt="AFK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEE.puz
function AEE()
{
    var builder = new PuzzleBuilder('AEE');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#0000ff', '6', 1, 1);
    builder.addNode('p2', '#ff0000', '13', 2, 0);
    builder.addNode('p3', '#0000ff', '6', 3, 1);
    builder.addNode('p4', '#ff0000', '13', 4, 0);
    builder.addNode('p5', '#0000ff', '6', 5, 1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEA');
    builder.addEasier('AEG');

    builder.addLocalMap('<image src="images/map_AEE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AEA" alt="AEA">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AEE" alt="AEE">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AEG" alt="AEG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADS.puz
function ADS()
{
    var builder = new PuzzleBuilder('ADS');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.0000, 1.0000);
    builder.addNode('x2', '#ff0000', '13', -2.0000, 0.0000);
    builder.addNode('x3', '#ff0000', '13', -1.0000, -1.0000);
    builder.addNode('y1', '#0000ff', '6', 0.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y3', '#0000ff', '6', 2.0000, 0.0000);
    builder.addNode('y4', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('y5', '#0000ff', '6', 0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3]]);
    builder.addPermutation('#0000ff', [[0, 8, 7, 6, 5, 4]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y4', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y5', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADR');

    builder.addHarder('AAZ');

    builder.addLocalMap('<image src="images/map_ADS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AAZ" alt="AAZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADR" alt="ADR">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ADS" alt="ADS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACL.puz
function ACL()
{
    var builder = new PuzzleBuilder('ACL');

    builder.addNode('p1', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', 1.0000, 1.7321);
    builder.addNode('p3', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p4', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p5', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p6', '#7f007f', '8', 1.0000, -1.7321);
    builder.addNode('p7', '#ff0000', '13', 4.0000, 0.0000);
    builder.addNode('p8', '#ffff00', '0', 2.0000, 3.4641);
    builder.addNode('p9', '#00ff00', '22', -2.0000, 3.4641);
    builder.addNode('p10', '#00ffff', '17', -4.0000, 0.0000);
    builder.addNode('p11', '#0000ff', '6', -2.0000, -3.4641);
    builder.addNode('p12', '#7f007f', '8', 2.0000, -3.4641);
    builder.addPermutation('#ff0000', [[1, 8, 7, 6]]);
    builder.addPermutation('#00ff00', [[5, 6, 11, 10]]);
    builder.addPermutation('#0000ff', [[3, 10, 9, 8]]);
    builder.addPermutation('#ffff00', [[1, 5, 3], [0, 2, 4]]);
    builder.addPermutation('#7f007f', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACK');

    builder.addLocalMap('<image src="images/map_ACL.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ACK" alt="ACK">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ACL" alt="ACL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHM.puz
function AHM()
{
    var builder = new PuzzleBuilder('AHM');

    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addPermutation('#0000ff', [[2, 0], [6, 1], [14, 12], [10, 3], [11, 13]]);
    builder.addPermutation('#ffff00', [[1, 11], [9, 5], [13, 6], [12, 8]]);
    builder.addPermutation('#00ff00', [[3, 7], [4, 15]]);
    builder.addPermutation('#00ffff', [[7, 4], [8, 9]]);
    builder.addPermutation('#ff00ff', [[5, 13]]);
    builder.addPermutation('#ff0000', [[13, 10], [0, 14]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHJ');

    builder.addHarder('AHL');
    builder.addHarder('AHP');

    builder.addLocalMap('<image src="images/map_AHM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AHJ" alt="AHJ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHL" alt="AHL">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHM" alt="AHM">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHP" alt="AHP">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHR.puz
function AHR()
{
    var builder = new PuzzleBuilder('AHR');

    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__3__1', '#00ff00', '22', -3, -1);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q__6__2', '#0000ff', '6', -6, -2);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q__8_1', '#7f007f', '8', -8, 1);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__9_1', '#0000ff', '6', -9, 1);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__5_1', '#00ff00', '22', -5, 1);
    builder.addNode('q__5__5', '#00ff00', '22', -5, -5);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q__8_2', '#ff0000', '13', -8, 2);
    builder.addNode('q__5__2', '#7f007f', '8', -5, -2);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addNode('q__5_0', '#ffff00', '0', -5, 0);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q__5__1', '#ff0000', '13', -5, -1);
    builder.addNode('q__6_1', '#ffff00', '0', -6, 1);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__6__4', '#00ff00', '22', -6, -4);
    builder.addNode('q__9_0', '#00ffff', '17', -9, 0);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q__4_0', '#00ff00', '22', -4, 0);
    builder.addNode('q__7_2', '#ffff00', '0', -7, 2);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__4__1', '#ffff00', '0', -4, -1);
    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q__6__3', '#00ffff', '17', -6, -3);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__3_0', '#00ffff', '17', -3, 0);
    builder.addNode('q__6_2', '#00ff00', '22', -6, 2);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q__6__1', '#7f007f', '8', -6, -1);
    builder.addNode('q__7_1', '#ff0000', '13', -7, 1);
    builder.addNode('q__4__5', '#00ffff', '17', -4, -5);
    builder.addNode('q__6_0', '#ff0000', '13', -6, 0);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5_2', '#00ffff', '17', -5, 2);
    builder.addNode('q__8_0', '#0000ff', '6', -8, 0);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addPermutation('#0000ff', [[3, 46], [26, 17], [12, 6], [13, 48], [39, 0], [44, 27], [16, 5], [22, 8], [10, 53], [9, 51], [47, 35], [40, 38]]);
    builder.addPermutation('#ff00ff', [[20, 53], [1, 43], [2, 0], [34, 38], [45, 33], [11, 4], [31, 41], [26, 23]]);
    builder.addPermutation('#00ff00', [[49, 27], [50, 37], [25, 24], [21, 36], [29, 30], [20, 17], [7, 32], [18, 33], [40, 28], [2, 42], [19, 6], [15, 14]]);
    builder.addPermutation('#ffff00', [[5, 7], [6, 29], [53, 13], [32, 52], [48, 10], [4, 12], [28, 20], [0, 22], [8, 39], [37, 2], [30, 19], [17, 40], [38, 26], [33, 15], [36, 11], [27, 47]]);
    builder.addPermutation('#ff0000', [[41, 20], [27, 9], [35, 16], [24, 21], [51, 44], [42, 18], [17, 3], [23, 49], [6, 50], [46, 26], [33, 2], [53, 31], [14, 40], [0, 45], [38, 1], [43, 34]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHO');
    builder.addEasier('AHS');

    builder.addHarder('AHQ');
    builder.addHarder('AHU');

    builder.addLocalMap('<image src="images/map_AHR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHO" alt="AHO">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHQ" alt="AHQ">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHR" alt="AHR">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AHS" alt="AHS">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHU" alt="AHU">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABO.puz
function ABO()
{
    var builder = new PuzzleBuilder('ABO');

    builder.addNode('p1', '#7f007f', '8', -0.0000, -2.0000);
    builder.addNode('p2', '#7f007f', '8', 2.0000, 0.0000);
    builder.addNode('p3', '#7f007f', '8', 0.0000, 2.0000);
    builder.addNode('p4', '#7f007f', '8', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', '13', -0.0000, -5.0000);
    builder.addNode('p6', '#ffff00', '0', 5.0000, 0.0000);
    builder.addNode('p7', '#ffff00', '0', 9.0000, 0.0000);
    builder.addNode('p8', '#00ff00', '22', 0.0000, 5.0000);
    builder.addNode('p9', '#00ff00', '22', -1.7321, 8.0000);
    builder.addNode('p10', '#00ff00', '22', 1.7321, 8.0000);
    builder.addNode('p11', '#0000ff', '6', -5.0000, 0.0000);
    builder.addNode('p12', '#0000ff', '6', -7.0000, -2.0000);
    builder.addNode('p13', '#0000ff', '6', -9.0000, 0.0000);
    builder.addNode('p14', '#0000ff', '6', -7.0000, 2.0000);
    builder.addPermutation('#ff0000', [[0, 3, 2, 1], [5, 6], [7, 8, 9], [10, 11, 12, 13]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 7], [3, 10]]);
    builder.addCircleArc('#ff0000', 'p1', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p6', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p7', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p8', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p9', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p10', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p11', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p12', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p13', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p14', 2.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABN');

    builder.addHarder('ABM');

    builder.addLocalMap('<image src="images/map_ABO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABM" alt="ABM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABN" alt="ABN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABO" alt="ABO">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACS.puz
function ACS()
{
    var builder = new PuzzleBuilder('ACS');

    builder.addNode('p00', '#ff0000', '13', 7, 0.0);
    builder.addNode('p10', '#ffff00', '0', 3, 3.0);
    builder.addNode('p11', '#ffff00', '0', 11, 3.0);
    builder.addNode('p20', '#00ff00', '22', 1, 6.0);
    builder.addNode('p21', '#00ff00', '22', 5, 6.0);
    builder.addNode('p22', '#00ff00', '22', 9, 6.0);
    builder.addNode('p23', '#00ff00', '22', 13, 6.0);
    builder.addNode('p30', '#0000ff', '6', 0, 9.0);
    builder.addNode('p31', '#0000ff', '6', 2, 9.0);
    builder.addNode('p32', '#0000ff', '6', 4, 9.0);
    builder.addNode('p33', '#0000ff', '6', 6, 9.0);
    builder.addNode('p34', '#7f007f', '8', 8, 9.0);
    builder.addNode('p35', '#7f007f', '8', 10, 9.0);
    builder.addNode('p36', '#7f007f', '8', 12, 9.0);
    builder.addNode('p37', '#7f007f', '8', 14, 9.0);
    builder.addPermutation('#ff0000', [[1, 3], [2, 5]]);
    builder.addPermutation('#0000ff', [[1, 4], [2, 6]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 7], [4, 9], [5, 11], [6, 13]]);
    builder.addPermutation('#ffff00', [[0, 2], [3, 8], [4, 10], [5, 12], [6, 14]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEN');
    builder.addEasier('AFI');

    builder.addLocalMap('<image src="images/map_ACS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=ACS" alt="ACS">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AEN" alt="AEN">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AFI" alt="AFI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACD.puz
function ACD()
{
    var builder = new PuzzleBuilder('ACD');

    builder.addNode('p1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('p2', '#ffff00', '0', -3.5000, 0.8660);
    builder.addNode('p3', '#0000ff', '6', -3.5000, 4.3301);
    builder.addNode('p4', '#00ff00', '22', -1.5000, 4.3301);
    builder.addNode('p5', '#ff0000', '13', 1.5000, 0.8660);
    builder.addNode('p6', '#ffff00', '0', 2.5000, 2.5981);
    builder.addNode('p7', '#0000ff', '6', 5.5000, 0.8660);
    builder.addNode('p8', '#00ff00', '22', 4.5000, -0.8660);
    builder.addNode('p9', '#ff0000', '13', -0.0000, -1.7321);
    builder.addNode('p10', '#ffff00', '0', 1.0000, -3.4641);
    builder.addNode('p11', '#0000ff', '6', -2.0000, -5.1962);
    builder.addNode('p12', '#00ff00', '22', -3.0000, -3.4641);
    builder.addPermutation('#0000ff', [[0, 3], [1, 2], [4, 5], [6, 7], [8, 10], [9, 11]]);
    builder.addPermutation('#ffff00', [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]);
    builder.addCircleArc('#0000ff', 'p1', 3.46410161514, false, true, false);
    builder.addCircleArc('#0000ff', 'p4', 3.46410161514, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 3.46410161514, false, true, false);
    builder.addCircleArc('#0000ff', 'p3', 3.46410161514, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 2.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p6', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 2.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p11', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 4.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 4.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p1', 1.73205080757, false, false, false);
    builder.addCircleArc('#ffff00', 'p2', 3.60555127546, false, false, false);
    builder.addCircleArc('#ffff00', 'p3', 5.56776436283, false, false, false);
    builder.addCircleArc('#ffff00', 'p4', 4.58257569496, false, false, false);
    builder.addCircleArc('#ffff00', 'p5', 1.73205080757, false, false, false);
    builder.addCircleArc('#ffff00', 'p6', 3.60555127546, false, false, false);
    builder.addCircleArc('#ffff00', 'p7', 5.56776436283, false, false, false);
    builder.addCircleArc('#ffff00', 'p8', 4.58257569496, false, false, false);
    builder.addCircleArc('#ffff00', 'p9', 1.73205080757, false, true, false);
    builder.addCircleArc('#ffff00', 'p10', 3.60555127546, false, true, false);
    builder.addCircleArc('#ffff00', 'p11', 5.56776436283, false, true, false);
    builder.addCircleArc('#ffff00', 'p12', 4.58257569496, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACC');

    builder.addLocalMap('<image src="images/map_ACD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ACC" alt="ACC">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ACD" alt="ACD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGR.puz
function AGR()
{
    var builder = new PuzzleBuilder('AGR');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [5, 6], [7, 8], [9, 10]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [2, 5]]);
    builder.addPermutation('#0000ff', [[3, 7], [4, 8], [5, 9], [6, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGP');

    builder.addHarder('AGT');

    builder.addLocalMap('<image src="images/map_AGR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGP" alt="AGP">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGR" alt="AGR">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGT" alt="AGT">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABT.puz
function ABT()
{
    var builder = new PuzzleBuilder('ABT');

    builder.addNode('p1', '#ffff00', '0', 0.0000, 0.0000);
    builder.addNode('p2', '#ffff00', '0', -3.0000, -0.0000);
    builder.addNode('p3', '#ff0000', '13', 1.5000, 2.5981);
    builder.addNode('p4', '#00ff00', '22', 1.5000, -2.5981);
    builder.addNode('p5', '#ff0000', '13', -4.5000, 2.5981);
    builder.addNode('p6', '#ff0000', '13', 4.5000, 2.5981);
    builder.addNode('p7', '#0000ff', '6', -0.0000, -5.1962);
    builder.addPermutation('#ff0000', [[0, 2], [3, 6]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4]]);
    builder.addPermutation('#0000ff', [[0, 1], [2, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFC');

    builder.addHarder('ACW');

    builder.addLocalMap('<image src="images/map_ABT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABT" alt="ABT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACW" alt="ACW">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFC" alt="AFC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABK.puz
function ABK()
{
    var builder = new PuzzleBuilder('ABK');

    builder.addNode('p1', '#7f007f', '8', -0.5000, 2.5981);
    builder.addNode('p2', '#7f007f', '8', -0.5000, -2.5981);
    builder.addNode('p3', '#ff0000', '13', -5.0000, -0.0000);
    builder.addNode('p4', '#0000ff', '6', 4.0000, 0.0000);
    builder.addNode('p5', '#ff0000', '13', -3.0000, 1.7321);
    builder.addNode('p6', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('p7', '#7f007f', '8', 0.0000, 0.0000);
    builder.addNode('p8', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('p9', '#ff0000', '13', -3.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 1, 2], [4, 6, 8]]);
    builder.addPermutation('#0000ff', [[0, 3, 1], [5, 7, 6]]);
    builder.addCircleArc('#ff0000', 'p1', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p3', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p5', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p7', 2.0, false, true, true);
    builder.addCircleArc('#ff0000', 'p9', 2.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p1', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p4', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 3.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p6', 1.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 1.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 1.0, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAF');
    builder.addEasier('ADN');

    builder.addHarder('ABL');
    builder.addHarder('ABU');
    builder.addHarder('ABX');

    builder.addLocalMap('<image src="images/map_ABK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAF" alt="AAF">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ABK" alt="ABK">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ABL" alt="ABL">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ABU" alt="ABU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABX" alt="ABX">');
    builder.addLocalMap('<area shape="rect" coords="225.0,0.0,325.0,100.0" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHQ.puz
function AHQ()
{
    var builder = new PuzzleBuilder('AHQ');

    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__3__1', '#00ff00', '22', -3, -1);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q__6__2', '#0000ff', '6', -6, -2);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q__8_1', '#7f007f', '8', -8, 1);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__9_1', '#0000ff', '6', -9, 1);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__5_1', '#00ff00', '22', -5, 1);
    builder.addNode('q__5__5', '#00ff00', '22', -5, -5);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q__8_2', '#ff0000', '13', -8, 2);
    builder.addNode('q__5__2', '#7f007f', '8', -5, -2);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addNode('q__5_0', '#ffff00', '0', -5, 0);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q__5__1', '#ff0000', '13', -5, -1);
    builder.addNode('q__6_1', '#ffff00', '0', -6, 1);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__6__4', '#00ff00', '22', -6, -4);
    builder.addNode('q__9_0', '#00ffff', '17', -9, 0);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q__4_0', '#00ff00', '22', -4, 0);
    builder.addNode('q__7_2', '#ffff00', '0', -7, 2);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__4__1', '#ffff00', '0', -4, -1);
    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q__6__3', '#00ffff', '17', -6, -3);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__3_0', '#00ffff', '17', -3, 0);
    builder.addNode('q__6_2', '#00ff00', '22', -6, 2);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q__6__1', '#7f007f', '8', -6, -1);
    builder.addNode('q__7_1', '#ff0000', '13', -7, 1);
    builder.addNode('q__4__5', '#00ffff', '17', -4, -5);
    builder.addNode('q__6_0', '#ff0000', '13', -6, 0);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5_2', '#00ffff', '17', -5, 2);
    builder.addNode('q__8_0', '#0000ff', '6', -8, 0);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addPermutation('#0000ff', [[1, 43], [16, 5], [34, 38], [50, 37], [44, 27], [29, 30], [11, 4], [9, 51], [20, 17], [13, 48], [39, 0], [18, 33], [40, 28], [22, 8], [47, 35], [10, 53], [2, 42], [26, 23], [19, 6], [15, 14]]);
    builder.addPermutation('#00ff00', [[20, 53], [49, 27], [2, 0], [3, 46], [26, 17], [25, 24], [21, 36], [12, 6], [7, 32], [45, 33], [31, 41], [40, 38]]);
    builder.addPermutation('#ffff00', [[5, 7], [6, 29], [53, 13], [32, 52], [48, 10], [4, 12], [28, 20], [0, 22], [8, 39], [37, 2], [30, 19], [17, 40], [38, 26], [33, 15], [36, 11], [27, 47]]);
    builder.addPermutation('#ff0000', [[41, 20], [27, 9], [35, 16], [24, 21], [51, 44], [42, 18], [17, 3], [23, 49], [6, 50], [46, 26], [33, 2], [53, 31], [14, 40], [0, 45], [38, 1], [43, 34]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHN');
    builder.addEasier('AHR');

    builder.addHarder('AHT');

    builder.addLocalMap('<image src="images/map_AHQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHN" alt="AHN">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHQ" alt="AHQ">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AHR" alt="AHR">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AHT" alt="AHT">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFJ.puz
function AFJ()
{
    var builder = new PuzzleBuilder('AFJ');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1, 0);
    builder.addNode('p2', '#00ff00', '22', 1, 1);
    builder.addNode('p3', '#00ffff', '17', 0, 2);
    builder.addNode('p4', '#0000ff', '6', -1, 1);
    builder.addNode('p5', '#7f007f', '8', -1, 0);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[3, 4]]);
    builder.addPermutation('#7f007f', [[1, 2], [4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEO');

    builder.addHarder('AEB');
    builder.addHarder('AEP');
    builder.addHarder('AFL');

    builder.addLocalMap('<image src="images/map_AFJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AEB" alt="AEB">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AEO" alt="AEO">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEP" alt="AEP">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AFJ" alt="AFJ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AFL" alt="AFL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABJ.puz
function ABJ()
{
    var builder = new PuzzleBuilder('ABJ');

    builder.addNode('r1c3', '#ff0000', '13', 7, 1);
    builder.addNode('r1c6', '#ff0000', '13', 16, 1);
    builder.addNode('r2c4', '#ffff00', '0', 10, 4);
    builder.addNode('r2c5', '#ffff00', '0', 13, 4);
    builder.addNode('r3c4', '#00ff00', '22', 10, 7);
    builder.addNode('r3c5', '#00ff00', '22', 13, 7);
    builder.addNode('r4c3', '#00ffff', '17', 7, 10);
    builder.addNode('r4c6', '#00ffff', '17', 16, 10);
    builder.addNode('r5c1', '#0000ff', '6', 1, 13);
    builder.addNode('r5c2', '#0000ff', '6', 4, 13);
    builder.addNode('r5c4', '#0000ff', '6', 10, 13);
    builder.addNode('r5c5', '#0000ff', '6', 13, 13);
    builder.addNode('r5c7', '#0000ff', '6', 19, 13);
    builder.addNode('r5c8', '#0000ff', '6', 22, 13);
    builder.addNode('r6c3', '#ff00ff', '4', 7, 16);
    builder.addNode('r6c6', '#ff00ff', '4', 16, 16);
    builder.addNode('r7c3', '#7f007f', '8', 7, 19);
    builder.addNode('r7c6', '#7f007f', '8', 16, 19);
    builder.addPermutation('#ff0000', [[10, 6, 4, 5, 7, 11]]);
    builder.addPermutation('#00ff00', [[10, 14, 9, 6], [4, 2, 3, 5], [11, 7, 12, 15]]);
    builder.addPermutation('#0000ff', [[14, 16], [9, 8], [2, 0], [3, 1], [12, 13], [15, 17]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABG');

    builder.addHarder('ABM');

    builder.addLocalMap('<image src="images/map_ABJ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABG" alt="ABG">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABJ" alt="ABJ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABM" alt="ABM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFF.puz
function AFF()
{
    var builder = new PuzzleBuilder('AFF');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#ffff00', '0', 1.0000, 0.0000);
    builder.addNode('p2', '#00ff00', '22', 0.3090, 0.9511);
    builder.addNode('p3', '#00ffff', '17', -0.8090, 0.5878);
    builder.addNode('p4', '#0000ff', '6', -0.8090, -0.5878);
    builder.addNode('p5', '#7f007f', '8', 0.3090, -0.9511);
    builder.addPermutation('#ffff00', [[0, 1]]);
    builder.addPermutation('#00ff00', [[0, 2]]);
    builder.addPermutation('#00ffff', [[0, 3]]);
    builder.addPermutation('#0000ff', [[0, 4]]);
    builder.addPermutation('#7f007f', [[0, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEM');

    builder.addLocalMap('<image src="images/map_AFF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AEM" alt="AEM">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AFF" alt="AFF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACV.puz
function ACV()
{
    var builder = new PuzzleBuilder('ACV');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#ff00ff', '4', 0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[2, 3], [5, 0]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACT');

    builder.addHarder('ADC');

    builder.addLocalMap('<image src="images/map_ACV.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ACT" alt="ACT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ACV" alt="ACV">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADC" alt="ADC">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADX.puz
function ADX()
{
    var builder = new PuzzleBuilder('ADX');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.0000, 1.0000);
    builder.addNode('x2', '#ffff00', '0', -2.0000, 0.0000);
    builder.addNode('x3', '#ff0000', '13', -1.0000, -1.0000);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('z1', '#00ff00', '22', -2.6910, 0.9511);
    builder.addNode('z2', '#00ff00', '22', -3.8090, 0.5878);
    builder.addNode('z3', '#00ff00', '22', -3.8090, -0.5878);
    builder.addNode('z4', '#00ff00', '22', -2.6910, -0.9511);
    builder.addPermutation('#ff0000', [[0, 1, 2, 3]]);
    builder.addPermutation('#0000ff', [[0, 5, 4]]);
    builder.addPermutation('#00ff00', [[2, 6, 7, 8, 9]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'x2', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'z1', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'z2', 1, true, false, true);
    builder.addCircleArc('#00ff00', 'z3', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'z4', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADW');
    builder.addEasier('ADQ');

    builder.addHarder('AFQ');

    builder.addLocalMap('<image src="images/map_ADX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADQ" alt="ADQ">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ADW" alt="ADW">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADX" alt="ADX">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AFQ" alt="AFQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAE.puz
function AAE()
{
    var builder = new PuzzleBuilder('AAE');

    builder.addNode('ul', '#ff0000', '13', 1, 1);
    builder.addNode('ur', '#ffff00', '0', 4, 1);
    builder.addNode('bl', '#0000ff', '6', 1, 4);
    builder.addNode('br', '#00ff00', '22', 4, 4);
    builder.addPermutation('#ff0000', [[0, 2], [1, 3]]);
    builder.addPermutation('#0000ff', [[0, 1], [2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACX');

    builder.addHarder('ACU');
    builder.addHarder('ACY');
    builder.addHarder('AHG');

    builder.addLocalMap('<image src="images/map_AAE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AAE" alt="AAE">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ACU" alt="ACU">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ACX" alt="ACX">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACY" alt="ACY">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHG" alt="AHG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHO.puz
function AHO()
{
    var builder = new PuzzleBuilder('AHO');

    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addPermutation('#0000ff', [[0, 21], [18, 6], [28, 4]]);
    builder.addPermutation('#ff00ff', [[25, 26], [5, 21], [17, 8], [11, 7]]);
    builder.addPermutation('#00ff00', [[20, 7], [9, 6], [1, 14], [5, 22], [3, 15], [13, 23], [27, 10], [24, 12], [16, 2]]);
    builder.addPermutation('#ffff00', [[4, 0], [26, 19], [6, 3], [15, 9], [23, 25], [7, 16], [21, 28], [8, 18], [10, 17], [12, 5]]);
    builder.addPermutation('#ff0000', [[2, 13], [7, 5], [14, 27], [6, 24], [21, 11], [22, 20]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHL');
    builder.addEasier('AHP');

    builder.addHarder('AHN');
    builder.addHarder('AHR');

    builder.addLocalMap('<image src="images/map_AHO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AHL" alt="AHL">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHN" alt="AHN">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AHO" alt="AHO">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AHP" alt="AHP">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHR" alt="AHR">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABB.puz
function ABB()
{
    var builder = new PuzzleBuilder('ABB');

    builder.addNode('r1c2', '#7f7f7f', '20', 1, 4);
    builder.addNode('r1c3', '#7f7f7f', '20', 1, 7);
    builder.addNode('r1c5', '#7f7f7f', '20', 1, 13);
    builder.addNode('r1c6', '#0000ff', '6', 1, 16);
    builder.addNode('r2c1', '#00ff00', '22', 4, 1);
    builder.addNode('r2c2', '#7f7f7f', '20', 4, 4);
    builder.addNode('r2c3', '#7f7f7f', '20', 4, 7);
    builder.addNode('r2c4', '#7f7f7f', '20', 4, 10);
    builder.addNode('r2c5', '#7f7f7f', '20', 4, 13);
    builder.addNode('r2c6', '#7f7f7f', '20', 4, 16);
    builder.addNode('r2c7', '#7f7f7f', '20', 4, 19);
    builder.addNode('r3c1', '#7f7f7f', '20', 7, 1);
    builder.addNode('r3c2', '#7f7f7f', '20', 7, 4);
    builder.addNode('r3c3', '#7f7f7f', '20', 7, 7);
    builder.addNode('r3c4', '#7f7f7f', '20', 7, 10);
    builder.addNode('r3c5', '#7f7f7f', '20', 7, 13);
    builder.addNode('r3c6', '#7f7f7f', '20', 7, 16);
    builder.addNode('r3c7', '#7f7f7f', '20', 7, 19);
    builder.addNode('r4c2', '#7f7f7f', '20', 10, 4);
    builder.addNode('r4c3', '#7f7f7f', '20', 10, 7);
    builder.addNode('r4c5', '#7f7f7f', '20', 10, 13);
    builder.addNode('r4c6', '#7f7f7f', '20', 10, 16);
    builder.addNode('r5c1', '#7f7f7f', '20', 13, 1);
    builder.addNode('r5c2', '#7f7f7f', '20', 13, 4);
    builder.addNode('r5c3', '#7f7f7f', '20', 13, 7);
    builder.addNode('r5c4', '#7f7f7f', '20', 13, 10);
    builder.addNode('r5c5', '#7f7f7f', '20', 13, 13);
    builder.addNode('r5c6', '#7f7f7f', '20', 13, 16);
    builder.addNode('r5c7', '#7f7f7f', '20', 13, 19);
    builder.addNode('r6c1', '#7f7f7f', '20', 16, 1);
    builder.addNode('r6c2', '#7f7f7f', '20', 16, 4);
    builder.addNode('r6c3', '#7f7f7f', '20', 16, 7);
    builder.addNode('r6c4', '#7f7f7f', '20', 16, 10);
    builder.addNode('r6c5', '#7f7f7f', '20', 16, 13);
    builder.addNode('r6c6', '#7f7f7f', '20', 16, 16);
    builder.addNode('r6c7', '#ff0000', '13', 16, 19);
    builder.addNode('r7c2', '#7f007f', '8', 19, 4);
    builder.addNode('r7c3', '#7f7f7f', '20', 19, 7);
    builder.addNode('r7c5', '#7f7f7f', '20', 19, 13);
    builder.addNode('r7c6', '#7f7f7f', '20', 19, 16);
    builder.addPermutation('#ff0000', [[7, 8], [15, 16], [26, 27], [0, 5], [12, 18], [23, 30], [6, 13], [19, 24], [31, 37], [25, 32], [33, 38], [3, 9], [34, 39], [10, 17], [28, 35]]);
    builder.addPermutation('#7f007f', [[2, 3], [4, 5], [6, 7], [11, 12], [13, 14], [18, 19], [20, 21], [23, 24], [29, 30], [31, 32], [36, 37], [8, 15], [26, 33], [9, 16], [27, 34]]);
    builder.addPermutation('#00ff00', [[9, 10], [14, 15], [22, 23], [24, 25], [27, 28], [30, 31], [32, 33], [34, 35], [38, 39], [5, 12], [1, 6], [13, 19], [2, 8], [20, 26], [16, 21]]);
    builder.addPermutation('#0000ff', [[0, 1], [5, 6], [8, 9], [12, 13], [16, 17], [25, 26], [33, 34], [4, 11], [22, 29], [18, 23], [30, 36], [24, 31], [7, 14], [15, 20], [21, 27]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGK');

    builder.addHarder('ACM');

    builder.addLocalMap('<image src="images/map_ABB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABB" alt="ABB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ACM" alt="ACM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGK" alt="AGK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFT.puz
function AFT()
{
    var builder = new PuzzleBuilder('AFT');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p30', '#00ff00', '22', 3, 0);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6]]);
    builder.addPermutation('#ffff00', [[7, 8]]);
    builder.addPermutation('#00ff00', [[3, 6]]);
    builder.addPermutation('#0000ff', [[0, 2], [4, 7], [5, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHI');

    builder.addHarder('AHK');

    builder.addLocalMap('<image src="images/map_AFT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AFT" alt="AFT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AHI" alt="AHI">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHK" alt="AHK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGY.puz
function AGY()
{
    var builder = new PuzzleBuilder('AGY');

    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[2, 3], [4, 5], [7, 8], [9, 10]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [5, 6], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6]]);
    builder.addPermutation('#0000ff', [[2, 7], [3, 8], [4, 9], [5, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGX');

    builder.addHarder('AGZ');

    builder.addLocalMap('<image src="images/map_AGY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGX" alt="AGX">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGY" alt="AGY">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGZ" alt="AGZ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGK.puz
function AGK()
{
    var builder = new PuzzleBuilder('AGK');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addPermutation('#ff0000', [[1, 2], [3, 4], [5, 6], [7, 8]]);
    builder.addPermutation('#ffff00', [[0, 1], [4, 5], [8, 9], [10, 11]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 6], [8, 10], [9, 11]]);
    builder.addPermutation('#0000ff', [[3, 7], [4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGI');

    builder.addHarder('ABB');
    builder.addHarder('AGL');

    builder.addLocalMap('<image src="images/map_AGK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABB" alt="ABB">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AGI" alt="AGI">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AGK" alt="AGK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AGL" alt="AGL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGX.puz
function AGX()
{
    var builder = new PuzzleBuilder('AGX');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p30', '#00ff00', '22', 3, 0);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addPermutation('#ff0000', [[2, 3], [5, 6], [8, 9]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [5, 8], [6, 9], [7, 10]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGT');

    builder.addHarder('AGY');

    builder.addLocalMap('<image src="images/map_AGX.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGT" alt="AGT">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGX" alt="AGX">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGY" alt="AGY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADR.puz
function ADR()
{
    var builder = new PuzzleBuilder('ADR');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ff0000', '13', -1.5000, -0.8660);
    builder.addNode('y1', '#0000ff', '6', 0.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y3', '#0000ff', '6', 2.0000, 0.0000);
    builder.addNode('y4', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('y5', '#0000ff', '6', 0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[0, 7, 6, 5, 4, 3]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y3', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y4', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y5', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADQ');

    builder.addHarder('ADS');

    builder.addLocalMap('<image src="images/map_ADR.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADQ" alt="ADQ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ADR" alt="ADR">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADS" alt="ADS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADC.puz
function ADC()
{
    var builder = new PuzzleBuilder('ADC');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACR');
    builder.addEasier('ACV');

    builder.addHarder('ADD');
    builder.addHarder('ADE');
    builder.addHarder('ADF');

    builder.addLocalMap('<image src="images/map_ADC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ACR" alt="ACR">');
    builder.addLocalMap('<area shape="rect" coords="225.0,0.0,325.0,100.0" href="index.html?puzzle=ACV" alt="ACV">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADC" alt="ADC">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADD" alt="ADD">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ADE" alt="ADE">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADF" alt="ADF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGE.puz
function AGE()
{
    var builder = new PuzzleBuilder('AGE');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#0000ff', '6', 1, 2);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#0000ff', '6', 2, 1);
    builder.addNode('p22', '#7f007f', '8', 2, 2);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [6, 7]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [7, 8]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [2, 5]]);
    builder.addPermutation('#0000ff', [[3, 6], [4, 7], [5, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGC');

    builder.addLocalMap('<image src="images/map_AGE.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGC" alt="AGC">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGE" alt="AGE">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFD.puz
function AFD()
{
    var builder = new PuzzleBuilder('AFD');

    builder.addNode('lhs', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('mid', '#ffff00', '0', 0, 0);
    builder.addNode('rhs', '#0000ff', '6', -0.8090, 0.5878);
    builder.addNode('top', '#7f007f', '8', -1.6180, 0.0000);
    builder.addNode('bot', '#00ff00', '22', 0.3090, -0.9511);
    builder.addNode('six', '#00ffff', '17', -1.9271, -0.9511);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);
    builder.addPermutation('#7f007f', [[5, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAD');

    builder.addHarder('AEV');
    builder.addHarder('AEW');
    builder.addHarder('AEX');

    builder.addLocalMap('<image src="images/map_AFD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEV" alt="AEV">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AEW" alt="AEW">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AEX" alt="AEX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AFD" alt="AFD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHT.puz
function AHT()
{
    var builder = new PuzzleBuilder('AHT');

    builder.addNode('q__8_9', '#ffff00', '0', -8, 9);
    builder.addNode('q__7_4', '#00ffff', '17', -7, 4);
    builder.addNode('q__3__1', '#00ff00', '22', -3, -1);
    builder.addNode('q__6_3', '#00ffff', '17', -6, 3);
    builder.addNode('q__9_2', '#7f007f', '8', -9, 2);
    builder.addNode('q__4__2', '#ff0000', '13', -4, -2);
    builder.addNode('q__4_2', '#0000ff', '6', -4, 2);
    builder.addNode('q__5_10', '#7f007f', '8', -5, 10);
    builder.addNode('q__6__2', '#0000ff', '6', -6, -2);
    builder.addNode('q_2__2', '#ff0000', '13', 2, -2);
    builder.addNode('q__3_3', '#ff0000', '13', -3, 3);
    builder.addNode('q__8_1', '#7f007f', '8', -8, 1);
    builder.addNode('q_1__2', '#7f007f', '8', 1, -2);
    builder.addNode('q__10_3', '#7f007f', '8', -10, 3);
    builder.addNode('q__9__1', '#00ff00', '22', -9, -1);
    builder.addNode('q__5_1', '#00ff00', '22', -5, 1);
    builder.addNode('q__5__5', '#00ff00', '22', -5, -5);
    builder.addNode('q__6_9', '#00ffff', '17', -6, 9);
    builder.addNode('q__3__2', '#ffff00', '0', -3, -2);
    builder.addNode('q__5_4', '#7f007f', '8', -5, 4);
    builder.addNode('q__6_4', '#0000ff', '6', -6, 4);
    builder.addNode('q__5__2', '#7f007f', '8', -5, -2);
    builder.addNode('q__9_1', '#0000ff', '6', -9, 1);
    builder.addNode('q__4_7', '#00ffff', '17', -4, 7);
    builder.addNode('q__5_9', '#0000ff', '6', -5, 9);
    builder.addNode('q_1_1', '#00ff00', '22', 1, 1);
    builder.addNode('q__7_10', '#00ffff', '17', -7, 10);
    builder.addNode('q__8__1', '#00ffff', '17', -8, -1);
    builder.addNode('q__5__1', '#ff0000', '13', -5, -1);
    builder.addNode('q__6_1', '#ffff00', '0', -6, 1);
    builder.addNode('q__4__3', '#7f007f', '8', -4, -3);
    builder.addNode('q__1__2', '#00ffff', '17', -1, -2);
    builder.addNode('q__6__4', '#00ff00', '22', -6, -4);
    builder.addNode('q__9_9', '#ff0000', '13', -9, 9);
    builder.addNode('q__8_3', '#ffff00', '0', -8, 3);
    builder.addNode('q__8_8', '#ff0000', '13', -8, 8);
    builder.addNode('q__2__3', '#ffff00', '0', -2, -3);
    builder.addNode('q__6_10', '#0000ff', '6', -6, 10);
    builder.addNode('q__7_2', '#ffff00', '0', -7, 2);
    builder.addNode('q__10_1', '#00ffff', '17', -10, 1);
    builder.addNode('q_0__3', '#00ffff', '17', 0, -3);
    builder.addNode('q__5_3', '#0000ff', '6', -5, 3);
    builder.addNode('q__5__3', '#0000ff', '6', -5, -3);
    builder.addNode('q_0_1', '#ffff00', '0', 0, 1);
    builder.addNode('q__4_4', '#ff0000', '13', -4, 4);
    builder.addNode('q__7_5', '#0000ff', '6', -7, 5);
    builder.addNode('q_0__2', '#0000ff', '6', 0, -2);
    builder.addNode('q__5_6', '#ffff00', '0', -5, 6);
    builder.addNode('q__6_2', '#00ff00', '22', -6, 2);
    builder.addNode('q__9_3', '#ff0000', '13', -9, 3);
    builder.addNode('q__6__1', '#7f007f', '8', -6, -1);
    builder.addNode('q__3_4', '#ffff00', '0', -3, 4);
    builder.addNode('q__8_0', '#0000ff', '6', -8, 0);
    builder.addNode('q__10_2', '#0000ff', '6', -10, 2);
    builder.addNode('q__8_5', '#00ffff', '17', -8, 5);
    builder.addNode('q__1__3', '#00ff00', '22', -1, -3);
    builder.addNode('q__6_8', '#00ff00', '22', -6, 8);
    builder.addNode('q__5_5', '#ff0000', '13', -5, 5);
    builder.addNode('q__6_7', '#ffff00', '0', -6, 7);
    builder.addNode('q__4_8', '#0000ff', '6', -4, 8);
    builder.addNode('q__4_6', '#00ff00', '22', -4, 6);
    builder.addNode('q_2__3', '#7f007f', '8', 2, -3);
    builder.addNode('q__3_7', '#0000ff', '6', -3, 7);
    builder.addNode('q__3__3', '#ff0000', '13', -3, -3);
    builder.addNode('q_2_0', '#00ff00', '22', 2, 0);
    builder.addNode('q_1__1', '#ff0000', '13', 1, -1);
    builder.addNode('q__3_8', '#7f007f', '8', -3, 8);
    builder.addNode('q__4__4', '#0000ff', '6', -4, -4);
    builder.addNode('q__4_3', '#7f007f', '8', -4, 3);
    builder.addNode('q__8_10', '#00ff00', '22', -8, 10);
    builder.addNode('q__8_2', '#ff0000', '13', -8, 2);
    builder.addNode('q__2__2', '#00ff00', '22', -2, -2);
    builder.addNode('q_1__3', '#0000ff', '6', 1, -3);
    builder.addNode('q__7_3', '#00ff00', '22', -7, 3);
    builder.addNode('q__10_0', '#00ff00', '22', -10, 0);
    builder.addNode('q_0__4', '#00ff00', '22', 0, -4);
    builder.addNode('q__5_0', '#ffff00', '0', -5, 0);
    builder.addNode('q_0_0', '#ff0000', '13', 0, 0);
    builder.addNode('q_2__1', '#ffff00', '0', 2, -1);
    builder.addNode('q_0__5', '#ffff00', '0', 0, -5);
    builder.addNode('q__5_7', '#00ff00', '22', -5, 7);
    builder.addNode('q__6_5', '#7f007f', '8', -6, 5);
    builder.addNode('q__9_0', '#00ffff', '17', -9, 0);
    builder.addNode('q__4_0', '#00ff00', '22', -4, 0);
    builder.addNode('q__5_8', '#00ffff', '17', -5, 8);
    builder.addNode('q_1_0', '#ffff00', '0', 1, 0);
    builder.addNode('q__7_9', '#00ff00', '22', -7, 9);
    builder.addNode('q__1__5', '#ff0000', '13', -1, -5);
    builder.addNode('q__4__1', '#ffff00', '0', -4, -1);
    builder.addNode('q__6__3', '#00ffff', '17', -6, -3);
    builder.addNode('q__9_8', '#7f007f', '8', -9, 8);
    builder.addNode('q__3_0', '#00ffff', '17', -3, 0);
    builder.addNode('q__8_4', '#00ff00', '22', -8, 4);
    builder.addNode('q__1__4', '#ffff00', '0', -1, -4);
    builder.addNode('q__7_1', '#ff0000', '13', -7, 1);
    builder.addNode('q__4__5', '#00ffff', '17', -4, -5);
    builder.addNode('q__6_0', '#ff0000', '13', -6, 0);
    builder.addNode('q__2__4', '#ff0000', '13', -2, -4);
    builder.addNode('q__5_2', '#00ffff', '17', -5, 2);
    builder.addNode('q__6_6', '#ff0000', '13', -6, 6);
    builder.addNode('q__5__4', '#00ffff', '17', -5, -4);
    builder.addPermutation('#0000ff', [[2, 91], [83, 88], [44, 68], [10, 51], [22, 4], [41, 19], [64, 78], [20, 3], [86, 26], [14, 82], [48, 29], [80, 84], [73, 1], [62, 66], [94, 38], [59, 23], [15, 98], [24, 7], [55, 31], [16, 100], [70, 11], [63, 18], [69, 0], [52, 27], [72, 12], [9, 61], [42, 21], [67, 95], [87, 93], [37, 17], [71, 36], [5, 30], [75, 79], [57, 47], [28, 76], [46, 40]]);
    builder.addPermutation('#00ff00', [[42, 100], [92, 54], [6, 68], [8, 50], [80, 47], [49, 4], [33, 90], [56, 17], [97, 36], [20, 81], [74, 39], [45, 1], [25, 85], [32, 89], [55, 93], [5, 88], [28, 21], [77, 43], [70, 34], [65, 12], [60, 23], [22, 82], [53, 13], [48, 3], [99, 58], [73, 38], [96, 29], [41, 98]]);
    builder.addPermutation('#ffff00', [[27, 14], [4, 70], [36, 63], [85, 64], [78, 65], [93, 75], [30, 42], [95, 16], [11, 22], [90, 35], [23, 80], [17, 86], [82, 52], [29, 94], [0, 33], [98, 6], [100, 67], [12, 9], [3, 73], [38, 48], [79, 87], [47, 60], [61, 72], [21, 5], [88, 28], [1, 20], [68, 41], [40, 55]]);
    builder.addPermutation('#ff0000', [[66, 59], [98, 48], [54, 45], [81, 57], [58, 80], [23, 62], [34, 73], [1, 92], [29, 15], [100, 32], [26, 69], [47, 99], [17, 24], [68, 10], [76, 96], [38, 70], [89, 42], [13, 49], [18, 5], [7, 37], [39, 22], [12, 46], [51, 44], [31, 71], [21, 8], [19, 20], [3, 41], [50, 28], [36, 55], [4, 53], [82, 74], [84, 56], [43, 25], [93, 97], [88, 2], [91, 83]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHQ');
    builder.addEasier('AHU');

    builder.addLocalMap('<image src="images/map_AHT.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AHQ" alt="AHQ">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=AHT" alt="AHT">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AHU" alt="AHU">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABW.puz
function ABW()
{
    var builder = new PuzzleBuilder('ABW');

    builder.addNode('p1', '#7f007f', '8', -2.2500, 1.2990);
    builder.addNode('p2', '#ffff00', '0', 2.2500, 1.2990);
    builder.addNode('p3', '#00ffff', '17', -0.0000, -2.5981);
    builder.addNode('p4', '#ff0000', '13', -2.2500, 3.8971);
    builder.addNode('p5', '#ff0000', '13', 2.2500, 3.8971);
    builder.addNode('p6', '#00ff00', '22', 4.5000, 0.0000);
    builder.addNode('p7', '#00ff00', '22', 2.2500, -3.8971);
    builder.addNode('p8', '#0000ff', '6', -2.2500, -3.8971);
    builder.addNode('p9', '#0000ff', '6', -4.5000, -0.0000);
    builder.addPermutation('#ff0000', [[0, 3, 4, 1]]);
    builder.addPermutation('#00ff00', [[1, 5, 6, 2]]);
    builder.addPermutation('#0000ff', [[2, 7, 8, 0]]);
    builder.addCircleArc('#ff0000', 'p1', 2.59807621135, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 4.5, false, false, false);
    builder.addCircleArc('#ff0000', 'p5', 2.59807621135, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 4.5, false, false, false);
    builder.addCircleArc('#00ff00', 'p2', 2.59807621135, false, false, false);
    builder.addCircleArc('#00ff00', 'p6', 4.5, false, false, false);
    builder.addCircleArc('#00ff00', 'p7', 2.59807621135, false, false, false);
    builder.addCircleArc('#00ff00', 'p3', 4.5, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 2.59807621135, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 4.5, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 2.59807621135, false, false, false);
    builder.addCircleArc('#0000ff', 'p1', 4.5, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABD');

    builder.addHarder('ABV');
    builder.addHarder('AHX');

    builder.addLocalMap('<image src="images/map_ABW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=ABD" alt="ABD">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ABV" alt="ABV">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ABW" alt="ABW">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AHX" alt="AHX">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAA.puz
function AAA()
{
    var builder = new PuzzleBuilder('AAA');

    builder.addNode('lhs', '#ff0000', '13', 1, 1);
    builder.addNode('rhs', '#0000ff', '6', 4, 1);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'rhs', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addHarder('AAB');
    builder.addHarder('ADA');

    builder.addLocalMap('<image src="images/map_AAA.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,33.3333333333,258.333333333,133.333333333" href="index.html?puzzle=AAA" alt="AAA">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,366.666666667,383.333333333,466.666666667" href="index.html?puzzle=AAB" alt="AAB">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=ADA" alt="ADA">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABQ.puz
function ABQ()
{
    var builder = new PuzzleBuilder('ABQ');

    builder.addNode('p1', '#ff0000', '13', -6.0000, -0.0000);
    builder.addNode('p2', '#0000ff', '6', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', '13', -3.0000, -0.0000);
    builder.addNode('p4', '#0000ff', '6', -1.5000, 2.5981);
    builder.addNode('p5', '#ff0000', '13', 0.0000, 0.0000);
    builder.addNode('p6', '#0000ff', '6', 1.5000, 2.5981);
    builder.addNode('p7', '#ff0000', '13', 3.0000, 0.0000);
    builder.addNode('p8', '#0000ff', '6', 4.5000, 2.5981);
    builder.addNode('p9', '#ff0000', '13', 6.0000, 0.0000);
    builder.addNode('p10', '#7f007f', '8', 0.0000, 5.1962);
    builder.addNode('p11', '#7f007f', '8', -0.0000, -3.4641);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4], [5, 6], [7, 8]]);
    builder.addPermutation('#7f007f', [[9, 7, 5, 3, 1], [0, 2, 4, 6, 8, 10]]);
    builder.addCircleArc('#7f007f', 'p2', 5.19615242271, false, false, false);
    builder.addCircleArc('#7f007f', 'p10', 5.19615242271, false, false, false);
    builder.addCircleArc('#7f007f', 'p9', 6.92820323028, false, false, false);
    builder.addCircleArc('#7f007f', 'p11', 6.92820323028, false, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABP');
    builder.addEasier('AAK');

    builder.addLocalMap('<image src="images/map_ABQ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="283.333333333,33.3333333333,383.333333333,133.333333333" href="index.html?puzzle=AAK" alt="AAK">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=ABP" alt="ABP">');
    builder.addLocalMap('<area shape="rect" coords="158.333333333,366.666666667,258.333333333,466.666666667" href="index.html?puzzle=ABQ" alt="ABQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHF.puz
function AHF()
{
    var builder = new PuzzleBuilder('AHF');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p33', '#ff00ff', '4', 3, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6], [7, 8], [9, 10]]);
    builder.addPermutation('#ffff00', [[3, 4], [6, 7]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [7, 9], [8, 10]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6], [4, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AHE');

    builder.addLocalMap('<image src="images/map_AHF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AHE" alt="AHE">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AHF" alt="AHF">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADW.puz
function ADW()
{
    var builder = new PuzzleBuilder('ADW');

    builder.addNode('x0', '#7f007f', '8', 0, 0);
    builder.addNode('x1', '#ff0000', '13', -1.5000, 0.8660);
    builder.addNode('x2', '#ffff00', '0', -1.5000, -0.8660);
    builder.addNode('y1', '#0000ff', '6', 1.5000, 0.8660);
    builder.addNode('y2', '#0000ff', '6', 1.5000, -0.8660);
    builder.addNode('z0', '#00ff00', '22', -3.0000, -1.7321);
    builder.addNode('z2', '#00ff00', '22', -1.5000, -2.5981);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[0, 4, 3]]);
    builder.addPermutation('#00ff00', [[2, 5, 6]]);
    builder.addCircleArc('#ff0000', 'x0', 1, true, false, false);
    builder.addCircleArc('#ff0000', 'x1', 1, true, false, true);
    builder.addCircleArc('#ff0000', 'x2', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'x0', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y1', 1, true, false, false);
    builder.addCircleArc('#0000ff', 'y2', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'x2', 1, true, false, true);
    builder.addCircleArc('#00ff00', 'z0', 1, true, false, false);
    builder.addCircleArc('#00ff00', 'z2', 1, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADN');

    builder.addHarder('ABD');
    builder.addHarder('ADX');
    builder.addHarder('AEL');

    builder.addLocalMap('<image src="images/map_ADW.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABD" alt="ABD">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADN" alt="ADN">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADW" alt="ADW">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=ADX" alt="ADX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEL" alt="AEL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADK.puz
function ADK()
{
    var builder = new PuzzleBuilder('ADK');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p8', '#00ff00', '22', -1.0000, 1.7321);
    builder.addNode('p9', '#00ffff', '17', -2.0000, 0.0000);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 9]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [2, 7]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6], [3, 8]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADG');
    builder.addEasier('ADH');
    builder.addEasier('ADI');

    builder.addHarder('ADL');

    builder.addLocalMap('<image src="images/map_ADK.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ADG" alt="ADG">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADK" alt="ADK">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADL" alt="ADL">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AHY.puz
function AHY()
{
    var builder = new PuzzleBuilder('AHY');

    builder.addNode('p0', '#ff0000', '13', 2, 2);
    builder.addNode('p1', '#ffff00', '0', 4, 2);
    builder.addNode('p2', '#7f007f', '8', 2, 4);
    builder.addNode('p3', '#00ffff', '17', 4, 4);
    builder.addNode('p4', '#ff0000', '13', 0, 0);
    builder.addNode('p5', '#ffff00', '0', 6, 0);
    builder.addNode('p6', '#00ffff', '17', 6, 6);
    builder.addNode('p7', '#7f007f', '8', 0, 6);
    builder.addNode('q0', '#ff7f00', '10', 3, 2);
    builder.addNode('q1', '#00ff00', '22', 4, 3);
    builder.addNode('q2', '#0000ff', '6', 3, 4);
    builder.addNode('q3', '#ff00ff', '4', 2, 3);
    builder.addNode('q4', '#ff0000', '13', 1, 1);
    builder.addNode('q5', '#ff7f00', '10', 3, 0);
    builder.addNode('q6', '#ffff00', '0', 5, 1);
    builder.addNode('q7', '#00ff00', '22', 6, 3);
    builder.addNode('q8', '#00ffff', '17', 5, 5);
    builder.addNode('q9', '#0000ff', '6', 3, 6);
    builder.addNode('q10', '#7f007f', '8', 1, 5);
    builder.addNode('q11', '#ff00ff', '4', 0, 3);
    builder.addPermutation('#ff0000', [[0, 4, 5, 1], [8, 12, 13, 14]]);
    builder.addPermutation('#ffff00', [[1, 5, 6, 3], [9, 14, 15, 16]]);
    builder.addPermutation('#00ff00', [[2, 3, 6, 7], [10, 16, 17, 18]]);
    builder.addPermutation('#0000ff', [[0, 2, 7, 4], [11, 18, 19, 12]]);
    builder.addPermutation('#7f007f', [[0, 1, 3, 2], [8, 9, 10, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABV');
    builder.addEasier('AHW');
    builder.addEasier('AHX');

    builder.addHarder('AHH');

    builder.addLocalMap('<image src="images/map_AHY.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ABV" alt="ABV">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHH" alt="AHH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AHW" alt="AHW">');
    builder.addLocalMap('<area shape="rect" coords="300.0,0.0,400.0,100.0" href="index.html?puzzle=AHX" alt="AHX">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AHY" alt="AHY">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEG.puz
function AEG()
{
    var builder = new PuzzleBuilder('AEG');

    builder.addNode('p0', '#ff0000', '13', 0, 0);
    builder.addNode('p1', '#0000ff', '6', 1, 1);
    builder.addNode('p2', '#ff0000', '13', 2, 0);
    builder.addNode('p3', '#0000ff', '6', 3, 1);
    builder.addNode('p4', '#ff0000', '13', 4, 0);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAR');
    builder.addEasier('ADY');

    builder.addHarder('ABP');
    builder.addHarder('AEE');

    builder.addLocalMap('<image src="images/map_AEG.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AAR" alt="AAR">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ABP" alt="ABP">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADY" alt="ADY">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEE" alt="AEE">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AEG" alt="AEG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGB.puz
function AGB()
{
    var builder = new PuzzleBuilder('AGB');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p30', '#00ffff', '17', 3, 0);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p33', '#ff00ff', '4', 3, 3);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5], [8, 9], [12, 13], [2, 3], [6, 7], [10, 11], [14, 15]]);
    builder.addPermutation('#ffff00', [[5, 6], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 6], [3, 7], [8, 12], [9, 13], [10, 14], [11, 15]]);
    builder.addPermutation('#0000ff', [[5, 9], [6, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFY');

    builder.addHarder('AGG');

    builder.addLocalMap('<image src="images/map_AGB.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFY" alt="AFY">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGB" alt="AGB">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGG" alt="AGG">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEO.puz
function AEO()
{
    var builder = new PuzzleBuilder('AEO');

    builder.addNode('p0', '#ff0000', '13', 0.5000, 1.5388);
    builder.addNode('p1', '#ffff00', '0', -0.3090, 0.9511);
    builder.addNode('p2', '#00ff00', '22', 0, 0);
    builder.addNode('p3', '#00ffff', '17', 1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', 1.3090, 0.9511);
    builder.addNode('p5', '#7f007f', '8', 2.1180, 0.3633);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[3, 4]]);
    builder.addPermutation('#7f007f', [[4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAS');

    builder.addHarder('AEQ');
    builder.addHarder('AER');
    builder.addHarder('AFJ');
    builder.addHarder('AFK');

    builder.addLocalMap('<image src="images/map_AEO.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AEO" alt="AEO">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=AEQ" alt="AEQ">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AER" alt="AER">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=AFJ" alt="AFJ">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AFK" alt="AFK">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGZ.puz
function AGZ()
{
    var builder = new PuzzleBuilder('AGZ');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [5, 6], [7, 8], [10, 11]]);
    builder.addPermutation('#ffff00', [[1, 2], [3, 4], [6, 7], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]);
    builder.addPermutation('#0000ff', [[7, 10], [8, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGY');

    builder.addHarder('AHA');

    builder.addLocalMap('<image src="images/map_AGZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGY" alt="AGY">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGZ" alt="AGZ">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AHA" alt="AHA">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AFZ.puz
function AFZ()
{
    var builder = new PuzzleBuilder('AFZ');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p30', '#00ffff', '17', 3, 0);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6], [8, 9]]);
    builder.addPermutation('#ffff00', [[3, 4], [6, 7]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [5, 8], [6, 9]]);
    builder.addPermutation('#0000ff', [[3, 6], [4, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFW');

    builder.addHarder('AGA');
    builder.addHarder('AGW');
    builder.addHarder('AHJ');

    builder.addLocalMap('<image src="images/map_AFZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AFW" alt="AFW">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=AFZ" alt="AFZ">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AGA" alt="AGA">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGW" alt="AGW">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AHJ" alt="AHJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADZ.puz
function ADZ()
{
    var builder = new PuzzleBuilder('ADZ');

    builder.addNode('p0', '#ff0000', '13', -1.0000, -0.0000);
    builder.addNode('p1', '#ffff00', '0', 0, 0);
    builder.addNode('p2', '#00ff00', '22', 0.5000, -0.8660);
    builder.addNode('p3', '#0000ff', '6', -0.0000, -1.7321);
    builder.addNode('p4', '#7f007f', '8', -1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4]]);
    builder.addPermutation('#00ff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[2, 3]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAS');

    builder.addHarder('AAP');
    builder.addHarder('ADT');
    builder.addHarder('AEB');

    builder.addLocalMap('<image src="images/map_ADZ.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="300.0,400.0,400.0,500.0" href="index.html?puzzle=AAP" alt="AAP">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=AAS" alt="AAS">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ADT" alt="ADT">');
    builder.addLocalMap('<area shape="rect" coords="150.0,200.0,250.0,300.0" href="index.html?puzzle=ADZ" alt="ADZ">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEB" alt="AEB">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGH.puz
function AGH()
{
    var builder = new PuzzleBuilder('AGH');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p02', '#00ff00', '22', 0, 2);
    builder.addNode('p03', '#00ffff', '17', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p05', '#7f007f', '8', 0, 5);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addNode('p15', '#ff00ff', '4', 1, 5);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]]);
    builder.addPermutation('#ffff00', [[1, 2], [3, 4], [7, 8], [9, 10]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGC');

    builder.addHarder('AGJ');
    builder.addHarder('AGN');
    builder.addHarder('AGO');
    builder.addHarder('AGQ');

    builder.addLocalMap('<image src="images/map_AGH.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="200.0,-4.54545454545,300.0,95.4545454545" href="index.html?puzzle=AGC" alt="AGC">');
    builder.addLocalMap('<area shape="rect" coords="200.0,177.272727273,300.0,277.272727273" href="index.html?puzzle=AGH" alt="AGH">');
    builder.addLocalMap('<area shape="rect" coords="268.181818182,359.090909091,368.181818182,459.090909091" href="index.html?puzzle=AGJ" alt="AGJ">');
    builder.addLocalMap('<area shape="rect" coords="131.818181818,359.090909091,231.818181818,459.090909091" href="index.html?puzzle=AGN" alt="AGN">');
    builder.addLocalMap('<area shape="rect" coords="-4.54545454545,359.090909091,95.4545454545,459.090909091" href="index.html?puzzle=AGO" alt="AGO">');
    builder.addLocalMap('<area shape="rect" coords="404.545454545,359.090909091,504.545454545,459.090909091" href="index.html?puzzle=AGQ" alt="AGQ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGU.puz
function AGU()
{
    var builder = new PuzzleBuilder('AGU');

    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p03', '#00ff00', '22', 0, 3);
    builder.addNode('p04', '#0000ff', '6', 0, 4);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p14', '#7f007f', '8', 1, 4);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [5, 6], [8, 9]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 5], [1, 6], [2, 7]]);
    builder.addPermutation('#0000ff', [[3, 8], [4, 9], [5, 10]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGS');

    builder.addLocalMap('<image src="images/map_AGU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGS" alt="AGS">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGU" alt="AGU">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AEI.puz
function AEI()
{
    var builder = new PuzzleBuilder('AEI');

    builder.addNode('p12', '#ff0000', '13', 1, 4);
    builder.addNode('p13', '#ffff00', '0', 1, 7);
    builder.addNode('p21', '#00ff00', '22', 4, 1);
    builder.addNode('p24', '#0000ff', '6', 4, 10);
    builder.addNode('p31', '#7f007f', '8', 7, 1);
    builder.addNode('p34', '#00ffff', '17', 7, 10);
    builder.addNode('p42', '#d01f90', '12', 10, 4);
    builder.addNode('p43', '#ff00ff', '4', 10, 7);
    builder.addPermutation('#ff0000', [[2, 4], [6, 7], [5, 3], [1, 0]]);
    builder.addPermutation('#0000ff', [[4, 6], [7, 5], [3, 1], [0, 2]]);
    builder.addPermutation('#ffff00', [[0, 6], [1, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AEH');

    builder.addHarder('AEJ');

    builder.addLocalMap('<image src="images/map_AEI.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AEH" alt="AEH">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AEI" alt="AEI">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AEJ" alt="AEJ">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ACU.puz
function ACU()
{
    var builder = new PuzzleBuilder('ACU');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#ff00ff', '4', 0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4], [5, 0]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAE');
    builder.addEasier('ACT');

    builder.addHarder('AEH');

    builder.addLocalMap('<image src="images/map_ACU.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AAE" alt="AAE">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ACT" alt="ACT">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ACU" alt="ACU">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=AEH" alt="AEH">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AAC.puz
function AAC()
{
    var builder = new PuzzleBuilder('AAC');

    builder.addNode('lhs', '#ff0000', '13', -0.5000, 0.8660);
    builder.addNode('mid', '#ffff00', '0', 0, 0);
    builder.addNode('rhs', '#0000ff', '6', 1.0000, 0.0000);
    builder.addNode('bot', '#00ff00', '22', -0.5000, -0.8660);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[1, 3]]);
    builder.addCircleArc('#ff0000', 'lhs', 1.0, true, false, false);
    builder.addCircleArc('#ff0000', 'mid', 1.0, true, false, false);
    builder.addCircleArc('#ffff00', 'mid', 1.0, true, false, false);
    builder.addCircleArc('#ffff00', 'rhs', 1.0, true, false, false);
    builder.addCircleArc('#0000ff', 'mid', 1.0, true, false, false);
    builder.addCircleArc('#0000ff', 'bot', 1.0, true, false, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AAB');

    builder.addHarder('AAD');
    builder.addHarder('AEM');

    builder.addLocalMap('<image src="images/map_AAC.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="75.0,0.0,175.0,100.0" href="index.html?puzzle=AAB" alt="AAB">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=AAC" alt="AAC">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=AAD" alt="AAD">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=AEM" alt="AEM">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADF.puz
function ADF()
{
    var builder = new PuzzleBuilder('ADF');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p10', '#0000ff', '6', -1.0000, -1.7321);
    builder.addNode('p11', '#7f007f', '8', 1.0000, -1.7321);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3], [4, 6]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4], [5, 7]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ADC');
    builder.addEasier('AFP');

    builder.addHarder('ADH');
    builder.addHarder('ADI');

    builder.addLocalMap('<image src="images/map_ADF.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADC" alt="ADC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADF" alt="ADF">');
    builder.addLocalMap('<area shape="rect" coords="0.0,400.0,100.0,500.0" href="index.html?puzzle=ADH" alt="ADH">');
    builder.addLocalMap('<area shape="rect" coords="150.0,400.0,250.0,500.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=AFP" alt="AFP">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGS.puz
function AGS()
{
    var builder = new PuzzleBuilder('AGS');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addPermutation('#ff0000', [[2, 3], [4, 5], [6, 7], [8, 9]]);
    builder.addPermutation('#ffff00', [[0, 1], [3, 4], [7, 8], [10, 11]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4], [7, 10], [8, 11]]);
    builder.addPermutation('#0000ff', [[2, 6], [3, 7], [4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AFU');

    builder.addHarder('AGU');

    builder.addLocalMap('<image src="images/map_AGS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AFU" alt="AFU">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGS" alt="AGS">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGU" alt="AGU">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ADD.puz
function ADD()
{
    var builder = new PuzzleBuilder('ADD');

    builder.addNode('p0', '#ff0000', '13', 1.0000, 0.0000);
    builder.addNode('p1', '#ffff00', '0', 0.5000, 0.8660);
    builder.addNode('p2', '#00ff00', '22', -0.5000, 0.8660);
    builder.addNode('p3', '#00ffff', '17', -1.0000, 0.0000);
    builder.addNode('p4', '#0000ff', '6', -0.5000, -0.8660);
    builder.addNode('p5', '#7f007f', '8', 0.5000, -0.8660);
    builder.addNode('p6', '#ff0000', '13', 2.0000, 0.0000);
    builder.addNode('p9', '#00ffff', '17', -2.0000, 0.0000);
    builder.addPermutation('#ff0000', [[0, 5], [2, 3]]);
    builder.addPermutation('#00ff00', [[0, 1], [3, 4]]);
    builder.addPermutation('#0000ff', [[1, 2], [4, 5], [0, 6], [3, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ACY');
    builder.addEasier('ADC');

    builder.addHarder('ADI');

    builder.addLocalMap('<image src="images/map_ADD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="0.0,0.0,100.0,100.0" href="index.html?puzzle=ACY" alt="ACY">');
    builder.addLocalMap('<area shape="rect" coords="150.0,0.0,250.0,100.0" href="index.html?puzzle=ADC" alt="ADC">');
    builder.addLocalMap('<area shape="rect" coords="75.0,200.0,175.0,300.0" href="index.html?puzzle=ADD" alt="ADD">');
    builder.addLocalMap('<area shape="rect" coords="75.0,400.0,175.0,500.0" href="index.html?puzzle=ADI" alt="ADI">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGD.puz
function AGD()
{
    var builder = new PuzzleBuilder('AGD');

    builder.addNode('p01', '#ff0000', '13', 0, 1);
    builder.addNode('p02', '#ffff00', '0', 0, 2);
    builder.addNode('p10', '#ff0000', '13', 1, 0);
    builder.addNode('p11', '#ffff00', '0', 1, 1);
    builder.addNode('p12', '#00ff00', '22', 1, 2);
    builder.addNode('p13', '#0000ff', '6', 1, 3);
    builder.addNode('p20', '#ffff00', '0', 2, 0);
    builder.addNode('p21', '#00ff00', '22', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addPermutation('#ff0000', [[0, 1], [3, 4], [7, 8]]);
    builder.addPermutation('#ffff00', [[2, 3], [4, 5], [6, 7], [8, 9]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4]]);
    builder.addPermutation('#0000ff', [[2, 6], [3, 7], [4, 8], [5, 9]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGC');

    builder.addLocalMap('<image src="images/map_AGD.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,33.3333333333,133.333333333,133.333333333" href="index.html?puzzle=AGC" alt="AGC">');
    builder.addLocalMap('<area shape="rect" coords="33.3333333333,366.666666667,133.333333333,466.666666667" href="index.html?puzzle=AGD" alt="AGD">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/ABS.puz
function ABS()
{
    var builder = new PuzzleBuilder('ABS');

    builder.addNode('p1', '#ff0000', '13', -3.5000, 0.0000);
    builder.addNode('p2', '#ff0000', '13', 1.7500, 3.0311);
    builder.addNode('p3', '#ff0000', '13', 1.7500, -3.0311);
    builder.addNode('p4', '#ffff00', '0', -5.5000, 0.0000);
    builder.addNode('p5', '#ffff00', '0', -8.0000, -4.3301);
    builder.addNode('p6', '#ffff00', '0', -13.0000, -4.3301);
    builder.addNode('p7', '#ffff00', '0', -15.5000, 0.0000);
    builder.addNode('p8', '#ffff00', '0', -13.0000, 4.3301);
    builder.addNode('p9', '#ffff00', '0', -8.0000, 4.3301);
    builder.addNode('p10', '#00ff00', '22', 2.7500, 4.7631);
    builder.addNode('p11', '#00ff00', '22', 0.2500, 9.0933);
    builder.addNode('p12', '#00ff00', '22', 2.7500, 13.4234);
    builder.addNode('p13', '#00ff00', '22', 7.7500, 13.4234);
    builder.addNode('p14', '#00ff00', '22', 10.2500, 9.0933);
    builder.addNode('p15', '#00ff00', '22', 7.7500, 4.7631);
    builder.addNode('p16', '#00ffff', '17', 2.7500, -4.7631);
    builder.addNode('p17', '#00ffff', '17', 7.7500, -4.7631);
    builder.addNode('p18', '#00ffff', '17', 10.2500, -9.0933);
    builder.addNode('p19', '#00ffff', '17', 7.7500, -13.4234);
    builder.addNode('p20', '#00ffff', '17', 2.7500, -13.4234);
    builder.addNode('p21', '#00ffff', '17', 0.2500, -9.0933);
    builder.addNode('p22', '#0000ff', '6', -14.0000, -6.0622);
    builder.addNode('p23', '#0000ff', '6', -14.0000, -12.1244);
    builder.addNode('p24', '#0000ff', '6', -19.2500, -9.0933);
    builder.addNode('p25', '#7f007f', '8', -14.0000, 6.0622);
    builder.addNode('p26', '#7f007f', '8', -19.2500, 9.0933);
    builder.addNode('p27', '#7f007f', '8', -14.0000, 12.1244);
    builder.addPermutation('#ff0000', [[0, 1, 2], [21, 22, 23], [24, 25, 26]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 9], [2, 15], [5, 21], [7, 24]]);
    builder.addPermutation('#0000ff', [[3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14], [15, 16, 17, 18, 19, 20]]);
    builder.addCircleArc('#ff0000', 'p1', 3.5, false, true, false);
    builder.addCircleArc('#ff0000', 'p2', 3.5, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 3.5, false, true, false);
    builder.addCircleArc('#ff0000', 'p22', 3.5, false, false, false);
    builder.addCircleArc('#ff0000', 'p23', 3.5, false, true, false);
    builder.addCircleArc('#ff0000', 'p24', 3.5, false, true, false);
    builder.addCircleArc('#ff0000', 'p25', 3.5, false, true, false);
    builder.addCircleArc('#ff0000', 'p26', 3.5, false, true, false);
    builder.addCircleArc('#ff0000', 'p27', 3.5, false, false, false);
    builder.addCircleArc('#0000ff', 'p4', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p5', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p7', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p8', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p9', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p10', 5.0, false, true, false);
    builder.addCircleArc('#0000ff', 'p11', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p12', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p13', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p14', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p15', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p16', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p17', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p18', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p19', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p20', 5.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p21', 5.0, false, true, false);

    builder.recenter();
    builder.normalize();

    builder.addEasier('ABN');

    builder.addHarder('ABM');

    builder.addLocalMap('<image src="images/map_ABS.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=ABM" alt="ABM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=ABN" alt="ABN">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=ABS" alt="ABS">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



// puzzles/AGM.puz
function AGM()
{
    var builder = new PuzzleBuilder('AGM');

    builder.addNode('p00', '#ff0000', '13', 0, 0);
    builder.addNode('p01', '#ffff00', '0', 0, 1);
    builder.addNode('p10', '#ffff00', '0', 1, 0);
    builder.addNode('p11', '#00ff00', '22', 1, 1);
    builder.addNode('p12', '#00ffff', '17', 1, 2);
    builder.addNode('p20', '#00ff00', '22', 2, 0);
    builder.addNode('p21', '#00ffff', '17', 2, 1);
    builder.addNode('p22', '#0000ff', '6', 2, 2);
    builder.addNode('p23', '#7f007f', '8', 2, 3);
    builder.addNode('p31', '#0000ff', '6', 3, 1);
    builder.addNode('p32', '#7f007f', '8', 3, 2);
    builder.addNode('p33', '#ff00ff', '4', 3, 3);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [5, 6], [7, 8], [10, 11]]);
    builder.addPermutation('#ffff00', [[3, 4], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[0, 2], [1, 3], [6, 9], [7, 10], [8, 11]]);
    builder.addPermutation('#0000ff', [[2, 5], [3, 6], [4, 7]]);

    builder.recenter();
    builder.normalize();

    builder.addEasier('AGL');

    builder.addHarder('AGP');

    builder.addLocalMap('<image src="images/map_AGM.png" usemap="#localmap">');
    builder.addLocalMap('<map name="localmap">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,0.0,100.0,100.0" href="index.html?puzzle=AGL" alt="AGL">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,200.0,100.0,300.0" href="index.html?puzzle=AGM" alt="AGM">');
    builder.addLocalMap('<area shape="rect" coords="7.1054273576e-15,400.0,100.0,500.0" href="index.html?puzzle=AGP" alt="AGP">');
    builder.addLocalMap('</map>');

    return builder.getPuzzleData();
}



g_puzzleList = [AAA(), AAB(), AAC(), AAD(), AAE(), AAF(), AAG(), AAH(), AAI(), AAJ(), AAK(), AAL(), AAM(), AAN(), AAO(), AAP(), AAQ(), AAR(), AAS(), AAT(), AAU(), AAV(), AAW(), AAX(), AAY(), AAZ(), ABA(), ABB(), ABC(), ABD(), ABE(), ABF(), ABG(), ABH(), ABI(), ABJ(), ABK(), ABL(), ABM(), ABN(), ABO(), ABP(), ABQ(), ABR(), ABS(), ABT(), ABU(), ABV(), ABW(), ABX(), ABY(), ABZ(), ACA(), ACB(), ACC(), ACD(), ACE(), ACF(), ACG(), ACH(), ACI(), ACJ(), ACK(), ACL(), ACM(), ACN(), ACO(), ACP(), ACQ(), ACR(), ACS(), ACT(), ACU(), ACV(), ACW(), ACX(), ACY(), ACZ(), ADA(), ADB(), ADC(), ADD(), ADE(), ADF(), ADG(), ADH(), ADI(), ADJ(), ADK(), ADL(), ADM(), ADN(), ADO(), ADP(), ADQ(), ADR(), ADS(), ADT(), ADU(), ADV(), ADW(), ADX(), ADY(), ADZ(), AEA(), AEB(), AEC(), AED(), AEE(), AEF(), AEG(), AEH(), AEI(), AEJ(), AEK(), AEL(), AEM(), AEN(), AEO(), AEP(), AEQ(), AER(), AES(), AET(), AEU(), AEV(), AEW(), AEX(), AEY(), AEZ(), AFA(), AFB(), AFC(), AFD(), AFE(), AFF(), AFG(), AFH(), AFI(), AFJ(), AFK(), AFL(), AFM(), AFN(), AFO(), AFP(), AFQ(), AFR(), AFS(), AFT(), AFU(), AFV(), AFW(), AFX(), AFY(), AFZ(), AGA(), AGB(), AGC(), AGD(), AGE(), AGF(), AGG(), AGH(), AGI(), AGJ(), AGK(), AGL(), AGM(), AGN(), AGO(), AGP(), AGQ(), AGR(), AGS(), AGT(), AGU(), AGV(), AGW(), AGX(), AGY(), AGZ(), AHA(), AHB(), AHC(), AHD(), AHE(), AHF(), AHG(), AHH(), AHI(), AHJ(), AHK(), AHL(), AHM(), AHN(), AHO(), AHP(), AHQ(), AHR(), AHS(), AHT(), AHU(), AHV(), AHW(), AHX(), AHY(), AHZ(), AIA(), AIB(), AIC(), AID(), AIE(), AIF(), AIG(), AIH(), AII(), AIJ(), AIK(), AIL(), AIM()];
g_puzzleIndex = 0;
g_puzzleData = g_puzzleList[g_puzzleIndex];

main();
