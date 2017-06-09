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
var STICKER_RADIUS = 5;

class Sticker
{
	constructor(color)
	{
		this.color = color;
		this.slot = null;
		this.prevArc = null;
		this.prevInverted = false;
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

	draw(context)
	{
		var center = this.getCenter();
		fillCircle(context, this.color, center.x, center.y, STICKER_RADIUS);
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
var SLOT_RADIUS = 8;

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
	}

	draw(context)
	{
		fillCircle(context, this.color, this.center.x, this.center.y, SLOT_RADIUS)
	}

	setSticker(sticker)
	{
		this.sticker = sticker;
	}

	getColor()
	{
		return this.color;
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

function refreshPuzzle()
{
	if (puzzleIndex <                  0) puzzleIndex = 0;
	if (puzzleIndex >= puzzleList.length) puzzleIndex = puzzleList.length - 1;
	
	puzzleData = puzzleList[puzzleIndex];
	g_actionPanel.setPuzzleData(puzzleData);
}

function previousPuzzle()
{
	--puzzleIndex;
	refreshPuzzle();
}

function nextPuzzle()
{
	++puzzleIndex;
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
		puzzleData.activatePermutation(e.keyCode - 49, inverted);
	if (e.keyCode == 48) // 0
		puzzleData.activatePermutation(10, inverted);
	if (e.keyCode == 90) // Z
		previousPuzzle();
	if (e.keyCode == 88) // X
		nextPuzzle();
	if (e.keyCode == 72) // H
		g_showHelp = g_showHelp == false;
	if (e.keyCode == 82) // R
		puzzleData.randomize();
	if (e.keyCode == 83) // S
		puzzleData.solve();
	if (e.keyCode == 74) // J
		g_actionPanel.prevAction();
	if (e.keyCode == 76) // L
		g_actionPanel.nextAction();
	if (e.keyCode == 73) // I
		g_actionPanel.activateAction(false);
	if (e.keyCode == 75) // K
		g_actionPanel.activateAction(true);
}

function update()
{
}

function draw()
{
	g_gameContext.clearRect(0, 0, g_gameCanvas.width, g_gameCanvas.height);

	puzzleData.draw(g_gameContext);
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
             		'            K - Activate Action (R)'
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

	addNode(nodeName, nodeColor, nodeX, nodeY)
	{
		var newSticker = new Sticker(nodeColor);
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
	}

	solve()
	{
		for (var i = 0; i < this.stickerList.length; i++)
		{
			var sticker = this.stickerList[i];
			sticker.setColor(sticker.getSlot().getColor());
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

function drawString(context, color, msg, x, y)
{
	context.fillStyle = color;
	context.fillText(msg, x, y);
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



// puzzles/AAJ.puz
function AAJ()
{
    var builder = new PuzzleBuilder('puzzles/AAJ');

    builder.addNode('lhs1', '#ff0000', 1, 1);
    builder.addNode('lhs2', '#ff7f00', 1, 4);
    builder.addNode('lhs3', '#ffff00', 1, 7);
    builder.addNode('rhs1', '#00ff00', 4, 1);
    builder.addNode('rhs2', '#00ffff', 4, 4);
    builder.addNode('rhs3', '#0000ff', 4, 7);
    builder.addNode('rhs4', '#ff00ff', 4, 10);
    builder.addNode('rhs5', '#7f007f', 4, 13);
    builder.addPermutation('#ff0000', [[0, 1, 2]]);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addPermutation('#0000ff', [[3, 4, 5, 6, 7]]);
    builder.addCircleArc('#ff0000', 'lhs3', 6.6, true, false, true);
    builder.addCircleArc('#00ff00', 'lhs1', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'rhs1', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'rhs5', 11.0, false, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAZ.puz
function AAZ()
{
    var builder = new PuzzleBuilder('puzzles/AAZ');

    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r2c1', '#ff7f00', 1, 4);
    builder.addNode('r2c3', '#ff7f00', 7, 4);
    builder.addNode('r3c1', '#ffff00', 1, 7);
    builder.addNode('r3c3', '#ffff00', 7, 7);
    builder.addNode('r4c2', '#00ff00', 4, 10);
    builder.addNode('r5c1', '#00ffff', 1, 13);
    builder.addNode('r5c3', '#00ffff', 7, 13);
    builder.addNode('r6c1', '#0000ff', 1, 16);
    builder.addNode('r6c3', '#0000ff', 7, 16);
    builder.addNode('r7c2', '#7f007f', 4, 19);
    builder.addPermutation('#ff0000', [[5, 3, 1, 0, 2, 4]]);
    builder.addPermutation('#0000ff', [[5, 7, 9, 10, 8, 6]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAS.puz
function AAS()
{
    var builder = new PuzzleBuilder('puzzles/AAS');

    builder.addNode('coord11', '#ff0000', 1, 1);
    builder.addNode('coord21', '#0000ff', 4, 1);
    builder.addNode('coord22', '#ff0000', 4, 4);
    builder.addNode('coord32', '#0000ff', 7, 4);
    builder.addNode('coord33', '#ff0000', 7, 7);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#00ff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[2, 3]]);
    builder.addPermutation('#ffff00', [[3, 4]]);
    builder.addCircleArc('#ff0000', 'coord11', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'coord21', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord21', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord22', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord22', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord32', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord32', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord33', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAT.puz
function AAT()
{
    var builder = new PuzzleBuilder('puzzles/AAT');

    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r2c1', '#ff7f00', 1, 4);
    builder.addNode('r2c2', '#ffff00', 4, 4);
    builder.addNode('r2c3', '#00ff00', 7, 4);
    builder.addNode('r3c1', '#0000ff', 1, 7);
    builder.addNode('r3c3', '#7f007f', 7, 7);
    builder.addPermutation('#ff0000', [[4, 1, 2, 3, 5]]);
    builder.addPermutation('#0000ff', [[0, 2]]);
    builder.addCircleArc('#0000ff', 'r1c2', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r2c2', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABR.puz
function ABR()
{
    var builder = new PuzzleBuilder('puzzles/ABR');

    builder.addNode('p1', '#ff0000', -2.0000, 3.4641);
    builder.addNode('p2', '#ff0000', 0.0000, 3.4641);
    builder.addNode('p3', '#ffff00', -5.0000, 1.7321);
    builder.addNode('p4', '#ffff00', -3.0000, 1.7321);
    builder.addNode('p5', '#ffff00', -1.0000, 1.7321);
    builder.addNode('p6', '#00ff00', -6.0000, -0.0000);
    builder.addNode('p7', '#00ff00', -4.0000, -0.0000);
    builder.addNode('p8', '#00ff00', -2.0000, -0.0000);
    builder.addNode('p9', '#00ff00', 0.0000, 0.0000);
    builder.addNode('p10', '#00ff00', 2.0000, 0.0000);
    builder.addNode('p11', '#00ff00', 4.0000, 0.0000);
    builder.addNode('p12', '#0000ff', -5.0000, -1.7321);
    builder.addNode('p13', '#0000ff', -1.0000, -1.7321);
    builder.addNode('p14', '#0000ff', 1.0000, -1.7321);
    builder.addNode('p15', '#0000ff', 3.0000, -1.7321);
    builder.addNode('p16', '#7f007f', -2.0000, -3.4641);
    builder.addNode('p17', '#7f007f', -0.0000, -3.4641);
    builder.addNode('p18', '#7f007f', 2.0000, -3.4641);
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

    return builder.getPuzzleData();
}



// puzzles/AAU.puz
function AAU()
{
    var builder = new PuzzleBuilder('puzzles/AAU');

    builder.addNode('upperleft', '#ff0000', 3, 1);
    builder.addNode('upperright', '#ffff00', 7, 1);
    builder.addNode('midleft', '#00ff00', 1, 4);
    builder.addNode('midright', '#0000ff', 9, 4);
    builder.addNode('bottom', '#7f007f', 5, 7);
    builder.addPermutation('#ff0000', [[4, 2, 0, 1, 3]]);
    builder.addPermutation('#0000ff', [[4, 1, 2, 3, 0]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAW.puz
function AAW()
{
    var builder = new PuzzleBuilder('puzzles/AAW');

    builder.addNode('r2c1', '#ff0000', 1, 4);
    builder.addNode('r2c2', '#ff0000', 4, 4);
    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r1c3', '#00ff00', 7, 1);
    builder.addNode('r1c4', '#00ff00', 10, 1);
    builder.addNode('r2c4', '#00ff00', 10, 4);
    builder.addNode('r3c4', '#0000ff', 10, 7);
    builder.addNode('r3c3', '#0000ff', 7, 7);
    builder.addNode('r4c3', '#0000ff', 7, 10);
    builder.addPermutation('#ff0000', [[0, 1], [4, 5]]);
    builder.addPermutation('#ffff00', [[1, 2], [5, 6]]);
    builder.addPermutation('#00ff00', [[2, 3], [6, 7]]);
    builder.addPermutation('#0000ff', [[3, 4], [7, 8]]);
    builder.addCircleArc('#ff0000', 'r2c1', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r2c2', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r1c4', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r2c4', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'r2c2', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'r1c2', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'r2c4', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'r3c4', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'r1c2', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r1c3', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r3c4', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r3c3', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r1c3', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r1c4', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r3c3', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r4c3', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABN.puz
function ABN()
{
    var builder = new PuzzleBuilder('puzzles/ABN');

    builder.addNode('p1', '#7f007f', -0.0000, -2.0000);
    builder.addNode('p2', '#7f007f', 2.0000, 0.0000);
    builder.addNode('p3', '#7f007f', 0.0000, 2.0000);
    builder.addNode('p4', '#7f007f', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', -0.0000, -5.0000);
    builder.addNode('p6', '#ffff00', 5.0000, 0.0000);
    builder.addNode('p7', '#ffff00', 9.0000, 0.0000);
    builder.addNode('p8', '#00ff00', 0.0000, 5.0000);
    builder.addNode('p9', '#00ff00', -1.7321, 8.0000);
    builder.addNode('p10', '#00ff00', 1.7321, 8.0000);
    builder.addNode('p11', '#0000ff', -5.0000, 0.0000);
    builder.addNode('p12', '#0000ff', -7.0000, -2.0000);
    builder.addNode('p13', '#0000ff', -9.0000, 0.0000);
    builder.addNode('p14', '#0000ff', -7.0000, 2.0000);
    builder.addPermutation('#ff0000', [[0, 3, 2, 1]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 7], [3, 10]]);
    builder.addPermutation('#0000ff', [[5, 6], [7, 8, 9], [10, 11, 12, 13]]);
    builder.addCircleArc('#ff0000', 'p1', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p1', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'p5', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p2', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p6', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p3', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p8', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'p4', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p11', 2.2, true, false, false);
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

    return builder.getPuzzleData();
}



// puzzles/ABA.puz
function ABA()
{
    var builder = new PuzzleBuilder('puzzles/ABA');

    builder.addNode('top', '#ffff00', 4, 1);
    builder.addNode('mid', '#ff0000', 4, 4);
    builder.addNode('lhs', '#0000ff', 1, 7);
    builder.addNode('rhs', '#00ff00', 7, 7);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[2, 1, 3]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABI.puz
function ABI()
{
    var builder = new PuzzleBuilder('puzzles/ABI');

    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r1c4', '#ff0000', 10, 1);
    builder.addNode('r2c1', '#ffff00', 1, 4);
    builder.addNode('r2c3', '#ffff00', 7, 4);
    builder.addNode('r2c5', '#ffff00', 13, 4);
    builder.addNode('r3c2', '#00ff00', 4, 7);
    builder.addNode('r3c4', '#00ff00', 10, 7);
    builder.addNode('r4c3', '#0000ff', 7, 10);
    builder.addNode('r4c5', '#0000ff', 13, 10);
    builder.addNode('r5c3', '#7f007f', 7, 13);
    builder.addNode('r5c5', '#7f007f', 13, 13);
    builder.addPermutation('#ff0000', [[2, 0, 3, 5], [7, 6, 8, 10, 9]]);
    builder.addPermutation('#0000ff', [[3, 1, 4, 6]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABY.puz
function ABY()
{
    var builder = new PuzzleBuilder('puzzles/ABY');

    builder.addNode('p1', '#7f007f', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', -16.5000, -2.5981);
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

    return builder.getPuzzleData();
}



// puzzles/ABF.puz
function ABF()
{
    var builder = new PuzzleBuilder('puzzles/ABF');

    builder.addNode('r1c1', '#ff0000', 1, 1);
    builder.addNode('r1c2', '#ffff00', 4, 1);
    builder.addNode('r2c1', '#ffff00', 1, 4);
    builder.addNode('r2c2', '#00ff00', 4, 4);
    builder.addNode('r2c3', '#0000ff', 7, 4);
    builder.addNode('r2c5', '#ffff00', 13, 4);
    builder.addNode('r3c2', '#0000ff', 4, 7);
    builder.addNode('r3c3', '#ff0000', 7, 7);
    builder.addNode('r3c4', '#ffff00', 10, 7);
    builder.addNode('r3c5', '#00ff00', 13, 7);
    builder.addNode('r4c3', '#ffff00', 7, 10);
    builder.addNode('r4c4', '#00ff00', 10, 10);
    builder.addNode('r4c5', '#0000ff', 13, 10);
    builder.addNode('r5c4', '#0000ff', 10, 13);
    builder.addPermutation('#ff0000', [[0, 2], [1, 3], [7, 10], [8, 11], [9, 12]]);
    builder.addPermutation('#ffff00', [[3, 6], [4, 7], [5, 9], [11, 13]]);
    builder.addPermutation('#00ff00', [[0, 1], [2, 3], [7, 8], [10, 11]]);
    builder.addPermutation('#0000ff', [[3, 4], [6, 7], [8, 9], [11, 12]]);
    builder.addCircleArc('#ff0000', 'r1c1', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r2c1', 2.2, true, false, true);
    builder.addCircleArc('#ff0000', 'r1c2', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r2c2', 2.2, true, false, true);
    builder.addCircleArc('#ff0000', 'r3c3', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r4c3', 2.2, true, false, true);
    builder.addCircleArc('#ff0000', 'r3c4', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r4c4', 2.2, true, false, true);
    builder.addCircleArc('#ff0000', 'r3c5', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'r4c5', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'r2c2', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'r3c2', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'r2c3', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'r3c3', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'r2c5', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'r3c5', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'r4c4', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'r5c4', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'r1c1', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r1c2', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r2c1', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r2c2', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r3c3', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r3c4', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r4c3', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'r4c4', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r2c2', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r2c3', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r3c2', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r3c3', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r3c4', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r3c5', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r4c4', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'r4c5', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAD.puz
function AAD()
{
    var builder = new PuzzleBuilder('puzzles/AAD');

    builder.addNode('lhs', '#ff0000', 1, 4);
    builder.addNode('mid', '#ffff00', 4, 4);
    builder.addNode('rhs', '#0000ff', 7, 4);
    builder.addNode('top', '#7f007f', 7, 1);
    builder.addNode('bot', '#00ff00', 4, 7);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[1, 4]]);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'mid', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'mid', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'rhs', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'top', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'mid', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'bot', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABG.puz
function ABG()
{
    var builder = new PuzzleBuilder('puzzles/ABG');

    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r1c6', '#00ff00', 16, 1);
    builder.addNode('r2c1', '#ff0000', 1, 4);
    builder.addNode('r2c3', '#7f0000', 7, 4);
    builder.addNode('r2c5', '#007f00', 13, 4);
    builder.addNode('r2c7', '#00ff00', 19, 4);
    builder.addNode('r3c2', '#7f0000', 4, 7);
    builder.addNode('r3c3', '#7f0000', 7, 7);
    builder.addNode('r3c5', '#007f00', 13, 7);
    builder.addNode('r3c6', '#007f00', 16, 7);
    builder.addNode('r4c4', '#7f7f7f', 10, 10);
    builder.addNode('r5c2', '#7f007f', 4, 13);
    builder.addNode('r5c3', '#7f007f', 7, 13);
    builder.addNode('r5c5', '#0000ff', 13, 13);
    builder.addNode('r5c6', '#0000ff', 16, 13);
    builder.addNode('r6c1', '#ff00ff', 1, 16);
    builder.addNode('r6c3', '#7f007f', 7, 16);
    builder.addNode('r6c5', '#0000ff', 13, 16);
    builder.addNode('r6c7', '#00ffff', 19, 16);
    builder.addNode('r7c2', '#ff00ff', 4, 19);
    builder.addNode('r7c6', '#00ffff', 16, 19);
    builder.addPermutation('#ff0000', [[6, 7, 10, 12, 11], [4, 1, 5, 9]]);
    builder.addPermutation('#ffff00', [[16, 12, 10, 13, 17], [6, 2, 0, 3]]);
    builder.addPermutation('#00ff00', [[4, 8, 10, 7, 3], [14, 18, 20, 17]]);
    builder.addPermutation('#0000ff', [[14, 13, 10, 8, 9], [16, 19, 15, 11]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/E1.puz
function E1()
{
    var builder = new PuzzleBuilder('puzzles/E1');

    builder.addNode('s1r1c1', '#ff0000', 1, 4);
    builder.addNode('s1r1c2', '#ff0000', 1, 5);
    builder.addNode('s1r1c3', '#ff0000', 1, 6);
    builder.addNode('s1r2c1', '#ff0000', 2, 4);
    builder.addNode('s1r2c2', '#ff0000', 2, 5);
    builder.addNode('s1r2c3', '#ff0000', 2, 6);
    builder.addNode('s1r3c1', '#ff0000', 3, 4);
    builder.addNode('s1r3c2', '#ff0000', 3, 5);
    builder.addNode('s1r3c3', '#ff0000', 3, 6);
    builder.addNode('s2r1c1', '#0000ff', 4, 7);
    builder.addNode('s2r1c2', '#0000ff', 4, 8);
    builder.addNode('s2r1c3', '#0000ff', 4, 9);
    builder.addNode('s2r2c1', '#0000ff', 5, 7);
    builder.addNode('s2r2c2', '#0000ff', 5, 8);
    builder.addNode('s2r2c3', '#0000ff', 5, 9);
    builder.addNode('s2r3c1', '#0000ff', 6, 7);
    builder.addNode('s2r3c2', '#0000ff', 6, 8);
    builder.addNode('s2r3c3', '#0000ff', 6, 9);
    builder.addNode('s3r1c1', '#00ff00', 7, 4);
    builder.addNode('s3r1c2', '#00ff00', 7, 5);
    builder.addNode('s3r1c3', '#00ff00', 7, 6);
    builder.addNode('s3r2c1', '#00ff00', 8, 4);
    builder.addNode('s3r2c2', '#00ff00', 8, 5);
    builder.addNode('s3r2c3', '#00ff00', 8, 6);
    builder.addNode('s3r3c1', '#00ff00', 9, 4);
    builder.addNode('s3r3c2', '#00ff00', 9, 5);
    builder.addNode('s3r3c3', '#00ff00', 9, 6);
    builder.addNode('s4r1c1', '#ffff00', 4, 1);
    builder.addNode('s4r1c2', '#ffff00', 4, 2);
    builder.addNode('s4r1c3', '#ffff00', 4, 3);
    builder.addNode('s4r2c1', '#ffff00', 5, 1);
    builder.addNode('s4r2c2', '#ffff00', 5, 2);
    builder.addNode('s4r2c3', '#ffff00', 5, 3);
    builder.addNode('s4r3c1', '#ffff00', 6, 1);
    builder.addNode('s4r3c2', '#ffff00', 6, 2);
    builder.addNode('s4r3c3', '#ffff00', 6, 3);
    builder.addPermutation('#ff0000', [[0, 11, 26, 29], [1, 14, 25, 30], [2, 14, 24, 27]]);
    builder.addPermutation('#0000ff', [[3, 10, 23, 34], [4, 13, 22, 31], [5, 16, 21, 28]]);
    builder.addPermutation('#00ff00', [[6, 9, 20, 35], [7, 12, 19, 32], [8, 15, 18, 29]]);
    builder.addPermutation('#ff00ff', [[0, 18], [3, 21], [6, 24]]);
    builder.addPermutation('#00ffff', [[1, 19], [4, 22], [7, 25]]);
    builder.addPermutation('#ffff00', [[0, 20], [3, 23], [8, 26]]);
    builder.addPermutation('#7f007f', [[27, 9], [28, 10], [29, 11]]);
    builder.addPermutation('#ff7f00', [[30, 12], [31, 13], [32, 14]]);
    builder.addPermutation('#7f7f7f', [[33, 15], [34, 16], [35, 17]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ACC.puz
function ACC()
{
    var builder = new PuzzleBuilder('puzzles/ACC');

    builder.addNode('p1', '#ff0000', -1.5000, 0.8660);
    builder.addNode('p2', '#ffff00', -3.5000, 0.8660);
    builder.addNode('p3', '#0000ff', -3.5000, 4.3301);
    builder.addNode('p4', '#00ff00', -1.5000, 4.3301);
    builder.addNode('p5', '#ff0000', 1.5000, 0.8660);
    builder.addNode('p6', '#ffff00', 2.5000, 2.5981);
    builder.addNode('p7', '#0000ff', 5.5000, 0.8660);
    builder.addNode('p8', '#00ff00', 4.5000, -0.8660);
    builder.addNode('p9', '#ff0000', -0.0000, -1.7321);
    builder.addNode('p10', '#ffff00', 1.0000, -3.4641);
    builder.addNode('p11', '#0000ff', -2.0000, -5.1962);
    builder.addNode('p12', '#00ff00', -3.0000, -3.4641);
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

    return builder.getPuzzleData();
}



// puzzles/AAI.puz
function AAI()
{
    var builder = new PuzzleBuilder('puzzles/AAI');

    builder.addNode('ul', '#ff0000', 3, 1);
    builder.addNode('ur', '#ffff00', 6, 1);
    builder.addNode('rhs', '#00ff00', 8, 4);
    builder.addNode('br', '#00ffff', 6, 7);
    builder.addNode('bl', '#0000ff', 3, 7);
    builder.addNode('lhs', '#7f007f', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[5, 4]]);
    builder.addPermutation('#00ff00', [[2, 3]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'bl', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'br', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ACE.puz
function ACE()
{
    var builder = new PuzzleBuilder('puzzles/ACE');

    builder.addNode('p1', '#ff0000', -5.0000, 5.1962);
    builder.addNode('p2', '#ff0000', -6.0000, 3.4641);
    builder.addNode('p3', '#ff0000', -7.0000, 1.7321);
    builder.addNode('p4', '#ff0000', -5.0000, 8.6603);
    builder.addNode('p5', '#ff0000', -6.0000, 10.3923);
    builder.addNode('p6', '#ff0000', -7.0000, 12.1244);
    builder.addNode('p7', '#ffffff', -2.0000, 6.9282);
    builder.addNode('p8', '#ffffff', 0.0000, 6.9282);
    builder.addNode('p9', '#ffffff', 2.0000, 6.9282);
    builder.addNode('p10', '#ffff00', 5.0000, 8.6603);
    builder.addNode('p11', '#ffff00', 6.0000, 10.3923);
    builder.addNode('p12', '#ffff00', 7.0000, 12.1244);
    builder.addNode('p13', '#ffffff', 5.0000, 5.1962);
    builder.addNode('p14', '#ffffff', 6.0000, 3.4641);
    builder.addNode('p15', '#ffffff', 7.0000, 1.7321);
    builder.addNode('p16', '#00ff00', 10.0000, 0.0000);
    builder.addNode('p17', '#00ff00', 12.0000, 0.0000);
    builder.addNode('p18', '#00ff00', 14.0000, 0.0000);
    builder.addNode('p19', '#ffffff', 7.0000, -1.7321);
    builder.addNode('p20', '#ffffff', 6.0000, -3.4641);
    builder.addNode('p21', '#ffffff', 5.0000, -5.1962);
    builder.addNode('p22', '#0000ff', 5.0000, -8.6603);
    builder.addNode('p23', '#0000ff', 6.0000, -10.3923);
    builder.addNode('p24', '#0000ff', 7.0000, -12.1244);
    builder.addNode('p25', '#0000ff', 2.0000, -6.9282);
    builder.addNode('p26', '#0000ff', -0.0000, -6.9282);
    builder.addNode('p27', '#0000ff', -2.0000, -6.9282);
    builder.addPermutation('#ff0000', [[0, 4, 8], [1, 5, 6], [2, 3, 7]]);
    builder.addPermutation('#ffff00', [[6, 9, 13], [7, 11, 12], [8, 10, 14]]);
    builder.addPermutation('#00ff00', [[12, 15, 19], [13, 17, 18], [14, 16, 20]]);
    builder.addPermutation('#0000ff', [[18, 21, 25], [19, 23, 24], [20, 22, 26]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABE.puz
function ABE()
{
    var builder = new PuzzleBuilder('puzzles/ABE');

    builder.addNode('r1c1', '#ff0000', 1, 1);
    builder.addNode('r1c3', '#ffff00', 5, 1);
    builder.addNode('r1c5', '#00ff00', 9, 1);
    builder.addNode('r2c2', '#00ffff', 3, 4);
    builder.addNode('r2c4', '#0000ff', 7, 4);
    builder.addNode('r3c3', '#7f007f', 5, 7);
    builder.addPermutation('#ff0000', [[0, 1, 3]]);
    builder.addPermutation('#00ff00', [[1, 2, 4]]);
    builder.addPermutation('#0000ff', [[3, 4, 5]]);
    builder.addPermutation('#7f007f', [[0, 2, 5]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABD.puz
function ABD()
{
    var builder = new PuzzleBuilder('puzzles/ABD');

    builder.addNode('r1c2', '#ff0000', 3, 1);
    builder.addNode('r1c4', '#ff0000', 7, 1);
    builder.addNode('r1c6', '#00ff00', 11, 1);
    builder.addNode('r1c8', '#00ff00', 15, 1);
    builder.addNode('r2c1', '#ff0000', 1, 4);
    builder.addNode('r2c5', '#7f007f', 9, 4);
    builder.addNode('r2c9', '#00ff00', 17, 4);
    builder.addNode('r3c2', '#ff0000', 3, 7);
    builder.addNode('r3c4', '#7f007f', 7, 7);
    builder.addNode('r3c6', '#7f007f', 11, 7);
    builder.addNode('r3c8', '#00ff00', 15, 7);
    builder.addNode('r4c3', '#0000ff', 5, 10);
    builder.addNode('r4c7', '#0000ff', 13, 10);
    builder.addNode('r5c4', '#0000ff', 7, 13);
    builder.addNode('r5c6', '#0000ff', 11, 13);
    builder.addPermutation('#ff0000', [[7, 4, 0, 1, 5, 8]]);
    builder.addPermutation('#00ff00', [[2, 3, 6, 10, 9, 5]]);
    builder.addPermutation('#0000ff', [[12, 14, 13, 11, 8, 9]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAK.puz
function AAK()
{
    var builder = new PuzzleBuilder('puzzles/AAK');

    builder.addNode('lhs1', '#ff0000', 1, 1);
    builder.addNode('lhs2', '#ff7f00', 1, 4);
    builder.addNode('lhs3', '#ffff00', 1, 7);
    builder.addNode('rhs1', '#00ff00', 4, 1);
    builder.addNode('rhs2', '#00ffff', 4, 4);
    builder.addNode('rhs3', '#0000ff', 4, 7);
    builder.addNode('rhs4', '#ff00ff', 4, 10);
    builder.addNode('rhs5', '#7f007f', 4, 13);
    builder.addPermutation('#00ff00', [[0, 3]]);
    builder.addPermutation('#0000ff', [[0, 1, 2], [3, 4, 5, 6, 7]]);
    builder.addCircleArc('#00ff00', 'lhs1', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'rhs1', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'lhs3', 6.6, true, false, true);
    builder.addCircleArc('#0000ff', 'rhs5', 11.0, false, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABL.puz
function ABL()
{
    var builder = new PuzzleBuilder('puzzles/ABL');

    builder.addNode('p1', '#ffff00', 0.0000, 6.9282);
    builder.addNode('p2', '#ffff00', -1.0000, 1.7321);
    builder.addNode('p3', '#ffff00', 1.0000, 1.7321);
    builder.addNode('p4', '#00ff00', -3.0000, -0.0000);
    builder.addNode('p5', '#00ff00', 0.0000, 0.0000);
    builder.addNode('p6', '#00ff00', 3.0000, 0.0000);
    builder.addNode('p7', '#00ffff', -1.0000, -1.7321);
    builder.addNode('p8', '#00ffff', 1.0000, -1.7321);
    builder.addNode('p9', '#00ffff', -0.0000, -6.9282);
    builder.addPermutation('#ffff00', [[0, 5, 3], [4, 1, 2]]);
    builder.addPermutation('#00ffff', [[8, 3, 5], [4, 7, 6]]);
    builder.addCircleArc('#ffff00', 'p1', 4.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p6', 4.0, false, false, false);
    builder.addCircleArc('#ffff00', 'p4', 4.0, false, true, false);
    builder.addCircleArc('#ffff00', 'p5', 1.2, false, true, false);
    builder.addCircleArc('#ffff00', 'p2', 1.2, false, false, false);
    builder.addCircleArc('#ffff00', 'p3', 1.2, false, false, false);
    builder.addCircleArc('#00ffff', 'p9', 4.0, false, true, false);
    builder.addCircleArc('#00ffff', 'p4', 4.0, false, false, false);
    builder.addCircleArc('#00ffff', 'p6', 4.0, false, false, false);
    builder.addCircleArc('#00ffff', 'p5', 1.2, false, false, false);
    builder.addCircleArc('#00ffff', 'p8', 1.2, false, false, false);
    builder.addCircleArc('#00ffff', 'p7', 1.2, false, true, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAY.puz
function AAY()
{
    var builder = new PuzzleBuilder('puzzles/AAY');

    builder.addNode('oul', '#ff0000', 4, 1);
    builder.addNode('our', '#ff7f00', 12, 1);
    builder.addNode('oml', '#ffff00', 1, 9);
    builder.addNode('omr', '#ff00ff', 15, 9);
    builder.addNode('obt', '#7f0000', 8, 13);
    builder.addNode('iul', '#00ffff', 6, 4);
    builder.addNode('iur', '#0000ff', 10, 4);
    builder.addNode('iml', '#00ff00', 4, 7);
    builder.addNode('imr', '#007f00', 12, 7);
    builder.addNode('ibt', '#7f007f', 8, 10);
    builder.addPermutation('#ff0000', [[4, 2, 0, 1, 3]]);
    builder.addPermutation('#00ff00', [[9, 4], [7, 2], [5, 0], [6, 1], [8, 3]]);
    builder.addPermutation('#0000ff', [[9, 6, 7, 8, 5]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAQ.puz
function AAQ()
{
    var builder = new PuzzleBuilder('puzzles/AAQ');

    builder.addNode('coord12', '#ff0000', 1, 4);
    builder.addNode('coord13', '#ffff00', 1, 7);
    builder.addNode('coord21', '#00ff00', 4, 1);
    builder.addNode('coord23', '#0000ff', 4, 7);
    builder.addNode('coord31', '#7f007f', 7, 1);
    builder.addNode('coord32', '#00ffff', 7, 4);
    builder.addPermutation('#ff0000', [[2, 5, 3, 0]]);
    builder.addPermutation('#00ff00', [[4, 3, 1, 0]]);
    builder.addPermutation('#0000ff', [[4, 5, 1, 2]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABP.puz
function ABP()
{
    var builder = new PuzzleBuilder('puzzles/ABP');

    builder.addNode('p1', '#ff0000', -6.0000, -0.0000);
    builder.addNode('p2', '#0000ff', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', -3.0000, -0.0000);
    builder.addNode('p4', '#0000ff', -1.5000, 2.5981);
    builder.addNode('p5', '#ff0000', 0.0000, 0.0000);
    builder.addNode('p6', '#0000ff', 1.5000, 2.5981);
    builder.addNode('p7', '#ff0000', 3.0000, 0.0000);
    builder.addNode('p8', '#0000ff', 4.5000, 2.5981);
    builder.addNode('p9', '#ff0000', 6.0000, 0.0000);
    builder.addNode('p10', '#ffff00', 0.0000, 5.1962);
    builder.addNode('p11', '#00ffff', -0.0000, -3.4641);
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

    return builder.getPuzzleData();
}



// puzzles/ABC.puz
function ABC()
{
    var builder = new PuzzleBuilder('puzzles/ABC');

    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r1c5', '#ffff00', 13, 1);
    builder.addNode('r2c1', '#ff0000', 1, 4);
    builder.addNode('r2c2', '#ff0000', 4, 4);
    builder.addNode('r2c5', '#ffff00', 13, 4);
    builder.addNode('r2c6', '#ffff00', 16, 4);
    builder.addNode('r3c3', '#7f007f', 7, 7);
    builder.addNode('r3c4', '#7f007f', 10, 7);
    builder.addNode('r4c3', '#7f007f', 7, 10);
    builder.addNode('r4c4', '#7f007f', 10, 10);
    builder.addNode('r5c1', '#0000ff', 1, 13);
    builder.addNode('r5c2', '#0000ff', 4, 13);
    builder.addNode('r5c5', '#00ff00', 13, 13);
    builder.addNode('r5c6', '#00ff00', 16, 13);
    builder.addNode('r6c2', '#0000ff', 4, 16);
    builder.addNode('r6c5', '#00ff00', 13, 16);
    builder.addPermutation('#ff0000', [[3, 4, 7, 6], [11, 8, 9, 12]]);
    builder.addPermutation('#ffff00', [[3, 2, 0], [12, 13, 15]]);
    builder.addPermutation('#00ff00', [[4, 1, 5], [11, 14, 10]]);
    builder.addPermutation('#0000ff', [[3, 6, 8, 11], [4, 7, 9, 12]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAV.puz
function AAV()
{
    var builder = new PuzzleBuilder('puzzles/AAV');

    builder.addNode('ulul', '#ff0000', 1, 1);
    builder.addNode('ulur', '#ff0000', 4, 1);
    builder.addNode('ulbl', '#ff0000', 1, 4);
    builder.addNode('ulbr', '#ff0000', 4, 4);
    builder.addNode('urul', '#ffff00', 10, 1);
    builder.addNode('urur', '#ffff00', 13, 1);
    builder.addNode('urbl', '#ffff00', 10, 4);
    builder.addNode('urbr', '#ffff00', 13, 4);
    builder.addNode('blul', '#00ff00', 1, 10);
    builder.addNode('blur', '#00ff00', 4, 10);
    builder.addNode('blbl', '#00ff00', 1, 13);
    builder.addNode('blbr', '#00ff00', 4, 13);
    builder.addNode('brul', '#0000ff', 10, 10);
    builder.addNode('brur', '#0000ff', 13, 10);
    builder.addNode('brbl', '#0000ff', 10, 13);
    builder.addNode('brbr', '#0000ff', 13, 13);
    builder.addNode('center', '#7f007f', 7, 7);
    builder.addPermutation('#ff0000', [[0, 1, 3, 2], [4, 5, 7, 6]]);
    builder.addPermutation('#ffff00', [[12, 13, 15, 14], [8, 9, 11, 10]]);
    builder.addPermutation('#00ff00', [[3, 16, 6]]);
    builder.addPermutation('#0000ff', [[9, 16, 12]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAL.puz
function AAL()
{
    var builder = new PuzzleBuilder('puzzles/AAL');

    builder.addNode('coord13', '#ff0000', 1, 7);
    builder.addNode('coord22', '#ffff00', 4, 4);
    builder.addNode('coord23', '#00ff00', 4, 7);
    builder.addNode('coord24', '#0000ff', 4, 10);
    builder.addNode('coord31', '#7f007f', 7, 1);
    builder.addNode('coord32', '#00ffff', 7, 4);
    builder.addNode('coord33', '#ed82ed', 7, 7);
    builder.addNode('coord34', '#a42a2a', 7, 10);
    builder.addNode('coord35', '#7f7f7f', 7, 13);
    builder.addNode('coord42', '#7f0000', 10, 4);
    builder.addNode('coord43', '#9931cc', 10, 7);
    builder.addNode('coord44', '#00858a', 10, 10);
    builder.addNode('coord53', '#9acd31', 13, 7);
    builder.addPermutation('#ff0000', [[0, 2], [6, 10]]);
    builder.addPermutation('#ffff00', [[1, 2], [4, 5], [6, 7], [9, 10]]);
    builder.addPermutation('#00ff00', [[2, 6], [10, 12]]);
    builder.addPermutation('#0000ff', [[2, 3], [5, 6], [7, 8], [10, 11]]);
    builder.addCircleArc('#ff0000', 'coord13', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'coord23', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'coord33', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'coord43', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord22', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord23', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'coord31', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord32', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'coord33', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord34', 2.2, true, false, true);
    builder.addCircleArc('#ffff00', 'coord42', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord43', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'coord23', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord33', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord43', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord53', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord23', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord24', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord32', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord33', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord34', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord35', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord43', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord44', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABX.puz
function ABX()
{
    var builder = new PuzzleBuilder('puzzles/ABX');

    builder.addNode('p1', '#7f007f', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', -16.5000, -2.5981);
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

    return builder.getPuzzleData();
}



// puzzles/AAX.puz
function AAX()
{
    var builder = new PuzzleBuilder('puzzles/AAX');

    builder.addNode('coord12', '#ff0000', 1, 4);
    builder.addNode('coord13', '#ffff00', 1, 7);
    builder.addNode('coord21', '#00ff00', 4, 1);
    builder.addNode('coord23', '#0000ff', 4, 7);
    builder.addNode('coord31', '#7f007f', 7, 1);
    builder.addNode('coord32', '#00ffff', 7, 4);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABZ.puz
function ABZ()
{
    var builder = new PuzzleBuilder('puzzles/ABZ');

    builder.addNode('p1', '#7f007f', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', -16.5000, -2.5981);
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

    return builder.getPuzzleData();
}



// puzzles/ABM.puz
function ABM()
{
    var builder = new PuzzleBuilder('puzzles/ABM');

    builder.addNode('p1', '#ffff00', 1.5000, 2.5981);
    builder.addNode('p2', '#ffff00', 1.5000, -2.5981);
    builder.addNode('p3', '#ffff00', -3.0000, -0.0000);
    builder.addNode('p4', '#ffff00', -2.5000, 4.3301);
    builder.addNode('p5', '#ffff00', 5.0000, 0.0000);
    builder.addNode('p6', '#ffff00', -2.5000, -4.3301);
    builder.addNode('p7', '#ffff00', -1.5000, 6.0622);
    builder.addNode('p8', '#ffff00', 6.0000, -1.7321);
    builder.addNode('p9', '#ffff00', -4.5000, -4.3301);
    builder.addNode('p10', '#0000ff', -8.0000, -0.0000);
    builder.addNode('p11', '#0000ff', -9.5000, 0.8660);
    builder.addNode('p12', '#0000ff', -9.5000, -0.8660);
    builder.addNode('p13', '#ff0000', 4.0000, 6.9282);
    builder.addNode('p14', '#ff0000', 4.0000, 8.6603);
    builder.addNode('p15', '#ff0000', 5.5000, 7.7942);
    builder.addNode('p16', '#00ff00', 4.0000, -6.9282);
    builder.addNode('p17', '#00ff00', 5.5000, -7.7942);
    builder.addNode('p18', '#00ff00', 4.0000, -8.6603);
    builder.addNode('p19', '#ff0000', -5.0000, -8.6603);
    builder.addNode('p20', '#ff0000', -8.0000, -13.8564);
    builder.addNode('p21', '#ff0000', -11.0000, -8.6603);
    builder.addNode('p22', '#ff0000', -7.0000, -8.6603);
    builder.addNode('p23', '#ff0000', -7.0000, -12.1244);
    builder.addNode('p24', '#ff0000', -10.0000, -10.3923);
    builder.addNode('p25', '#0000ff', 11.0000, -1.7321);
    builder.addNode('p26', '#0000ff', 14.0000, 0.0000);
    builder.addNode('p27', '#0000ff', 14.0000, -3.4641);
    builder.addNode('p28', '#0000ff', 10.0000, 0.0000);
    builder.addNode('p29', '#0000ff', 16.0000, 0.0000);
    builder.addNode('p30', '#0000ff', 13.0000, -5.1962);
    builder.addNode('p31', '#00ff00', -4.0000, 10.3923);
    builder.addNode('p32', '#00ff00', -7.0000, 12.1244);
    builder.addNode('p33', '#00ff00', -4.0000, 13.8564);
    builder.addNode('p34', '#00ff00', -5.0000, 8.6603);
    builder.addNode('p35', '#00ff00', -8.0000, 13.8564);
    builder.addNode('p36', '#00ff00', -2.0000, 13.8564);
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
    builder.addCircleArc('#7f007f', 'p4', 4.2, false, true, false);
    builder.addCircleArc('#7f007f', 'p34', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p5', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p28', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p6', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p19', 4.2, false, true, false);
    builder.addCircleArc('#7f007f', 'p7', 4.2, false, true, false);
    builder.addCircleArc('#7f007f', 'p31', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p8', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p25', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p9', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p22', 4.2, false, true, false);
    builder.addCircleArc('#7f007f', 'p1', 4.2, false, true, false);
    builder.addCircleArc('#7f007f', 'p13', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p2', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p16', 4.2, false, true, false);
    builder.addCircleArc('#7f007f', 'p3', 4.2, false, false, false);
    builder.addCircleArc('#7f007f', 'p10', 4.2, false, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAH.puz
function AAH()
{
    var builder = new PuzzleBuilder('puzzles/AAH');

    builder.addNode('ul', '#ff0000', 3, 1);
    builder.addNode('ur', '#ffff00', 6, 1);
    builder.addNode('rhs', '#00ff00', 8, 4);
    builder.addNode('br', '#00ffff', 6, 7);
    builder.addNode('bl', '#0000ff', 3, 7);
    builder.addNode('lhs', '#7f007f', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#00ff00', [[4, 3]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'bl', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'br', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAG.puz
function AAG()
{
    var builder = new PuzzleBuilder('puzzles/AAG');

    builder.addNode('ul', '#ff0000', 3, 1);
    builder.addNode('ur', '#ffff00', 6, 1);
    builder.addNode('rhs', '#00ff00', 8, 4);
    builder.addNode('br', '#00ffff', 6, 7);
    builder.addNode('bl', '#0000ff', 3, 7);
    builder.addNode('lhs', '#7f007f', 1, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[0, 1, 2, 3, 4, 5]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABU.puz
function ABU()
{
    var builder = new PuzzleBuilder('puzzles/ABU');

    builder.addNode('p1', '#ffffff', 0.0000, 0.0000);
    builder.addNode('p2', '#7f007f', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', 0.0000, 5.1962);
    builder.addNode('p4', '#ffff00', 4.5000, 2.5981);
    builder.addNode('p5', '#00ff00', 4.5000, -2.5981);
    builder.addNode('p6', '#00ffff', 0.0000, -5.1962);
    builder.addNode('p7', '#0000ff', -4.5000, -2.5981);
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

    return builder.getPuzzleData();
}



// puzzles/ABV.puz
function ABV()
{
    var builder = new PuzzleBuilder('puzzles/ABV');

    builder.addNode('p1', '#ffffff', 0.0000, 0.0000);
    builder.addNode('p2', '#7f007f', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', 0.0000, 5.1962);
    builder.addNode('p4', '#ffff00', 4.5000, 2.5981);
    builder.addNode('p5', '#00ff00', 4.5000, -2.5981);
    builder.addNode('p6', '#00ffff', 0.0000, -5.1962);
    builder.addNode('p7', '#0000ff', -4.5000, -2.5981);
    builder.addNode('p8', '#7f007f', -2.2500, 1.2990);
    builder.addNode('p9', '#ffff00', 2.2500, 1.2990);
    builder.addNode('p10', '#00ffff', -0.0000, -2.5981);
    builder.addNode('p11', '#ff0000', -2.2500, 3.8971);
    builder.addNode('p12', '#ff0000', 2.2500, 3.8971);
    builder.addNode('p13', '#00ff00', 4.5000, 0.0000);
    builder.addNode('p14', '#00ff00', 2.2500, -3.8971);
    builder.addNode('p15', '#0000ff', -2.2500, -3.8971);
    builder.addNode('p16', '#0000ff', -4.5000, -0.0000);
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

    return builder.getPuzzleData();
}



// puzzles/ACA.puz
function ACA()
{
    var builder = new PuzzleBuilder('puzzles/ACA');

    builder.addNode('p1', '#7f007f', 3.0000, 0.0000);
    builder.addNode('p2', '#7f007f', 1.5000, 2.5981);
    builder.addNode('p3', '#0000ff', -1.5000, 2.5981);
    builder.addNode('p4', '#0000ff', -3.0000, 0.0000);
    builder.addNode('p5', '#0000ff', -1.5000, -2.5981);
    builder.addNode('p6', '#7f007f', 1.5000, -2.5981);
    builder.addNode('p7', '#0000ff', 0.0000, 0.0000);
    builder.addNode('p8', '#00ffff', -4.5000, 2.5981);
    builder.addNode('p9', '#00ffff', -6.0000, 0.0000);
    builder.addNode('p10', '#00ffff', -4.5000, -2.5981);
    builder.addNode('p11', '#00ff00', -9.0000, 0.0000);
    builder.addNode('p12', '#00ff00', -10.5000, 2.5981);
    builder.addNode('p13', '#ffff00', -13.5000, 2.5981);
    builder.addNode('p14', '#ffff00', -15.0000, 0.0000);
    builder.addNode('p15', '#ffff00', -13.5000, -2.5981);
    builder.addNode('p16', '#00ff00', -10.5000, -2.5981);
    builder.addNode('p17', '#ffff00', -12.0000, 0.0000);
    builder.addNode('p18', '#ff0000', -16.5000, 2.5981);
    builder.addNode('p19', '#ff0000', -18.0000, 0.0000);
    builder.addNode('p20', '#ff0000', -16.5000, -2.5981);
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

    return builder.getPuzzleData();
}



// puzzles/AAR.puz
function AAR()
{
    var builder = new PuzzleBuilder('puzzles/AAR');

    builder.addNode('coord11', '#ff0000', 1, 1);
    builder.addNode('coord12', '#ff0000', 1, 4);
    builder.addNode('coord22', '#0000ff', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[1, 2]]);
    builder.addCircleArc('#ff0000', 'coord11', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'coord12', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord12', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord22', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAO.puz
function AAO()
{
    var builder = new PuzzleBuilder('puzzles/AAO');

    builder.addNode('coord11', '#ff0000', 1, 1);
    builder.addNode('coord12', '#ff0000', 1, 4);
    builder.addNode('coord21', '#ff0000', 4, 1);
    builder.addNode('coord22', '#ff0000', 4, 4);
    builder.addNode('coord31', '#00ff00', 7, 1);
    builder.addNode('coord32', '#00ff00', 7, 4);
    builder.addNode('coord41', '#00ff00', 10, 1);
    builder.addNode('coord42', '#00ff00', 10, 4);
    builder.addNode('coord33', '#0000ff', 7, 7);
    builder.addNode('coord34', '#0000ff', 7, 10);
    builder.addNode('coord43', '#0000ff', 10, 7);
    builder.addNode('coord44', '#0000ff', 10, 10);
    builder.addPermutation('#7f007f', [[0, 2, 3, 1], [4, 6, 7, 5], [8, 10, 11, 9]]);
    builder.addPermutation('#ff0000', [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ACB.puz
function ACB()
{
    var builder = new PuzzleBuilder('puzzles/ACB');

    builder.addNode('p1', '#ff0000', 2.0000, 0.0000);
    builder.addNode('p2', '#ffff00', 1.0000, 1.7321);
    builder.addNode('p3', '#ff0000', -1.0000, 1.7321);
    builder.addNode('p4', '#ffff00', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', -1.0000, -1.7321);
    builder.addNode('p6', '#ffff00', 1.0000, -1.7321);
    builder.addNode('p7', '#00ff00', 4.0000, 0.0000);
    builder.addNode('p8', '#00ffff', 2.0000, 3.4641);
    builder.addNode('p9', '#00ff00', -2.0000, 3.4641);
    builder.addNode('p10', '#00ffff', -4.0000, 0.0000);
    builder.addNode('p11', '#00ff00', -2.0000, -3.4641);
    builder.addNode('p12', '#00ffff', 2.0000, -3.4641);
    builder.addNode('p13', '#0000ff', 6.0000, 0.0000);
    builder.addNode('p14', '#7f007f', 3.0000, 5.1962);
    builder.addNode('p15', '#0000ff', -3.0000, 5.1962);
    builder.addNode('p16', '#7f007f', -6.0000, 0.0000);
    builder.addNode('p17', '#0000ff', -3.0000, -5.1962);
    builder.addNode('p18', '#7f007f', 3.0000, -5.1962);
    builder.addPermutation('#ff0000', [[0, 7, 2, 15, 4, 5], [6, 13, 14, 9, 10, 11, 12, 1, 8, 3, 16, 17]]);
    builder.addPermutation('#00ff00', [[6, 12], [7, 13], [8, 14], [9, 15], [10, 16], [11, 17]]);
    builder.addPermutation('#0000ff', [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABH.puz
function ABH()
{
    var builder = new PuzzleBuilder('puzzles/ABH');

    builder.addNode('r1c2', '#ff0000', 4, 1);
    builder.addNode('r1c4', '#ff0000', 10, 1);
    builder.addNode('r2c1', '#ffff00', 1, 4);
    builder.addNode('r2c3', '#ffff00', 7, 4);
    builder.addNode('r2c5', '#ffff00', 13, 4);
    builder.addNode('r3c2', '#00ff00', 4, 7);
    builder.addNode('r3c4', '#00ff00', 10, 7);
    builder.addNode('r4c3', '#0000ff', 7, 10);
    builder.addNode('r4c5', '#0000ff', 13, 10);
    builder.addNode('r5c4', '#7f007f', 10, 13);
    builder.addPermutation('#ff0000', [[2, 0, 3, 5], [7, 6, 8, 9]]);
    builder.addPermutation('#0000ff', [[3, 1, 4, 6]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAB.puz
function AAB()
{
    var builder = new PuzzleBuilder('puzzles/AAB');

    builder.addNode('lhs', '#ff0000', 1, 1);
    builder.addNode('rhs', '#00ff00', 4, 1);
    builder.addNode('bot', '#0000ff', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#0000ff', [[1, 2]]);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'bot', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAN.puz
function AAN()
{
    var builder = new PuzzleBuilder('puzzles/AAN');

    builder.addNode('coord12', '#ff0000', 1, 4);
    builder.addNode('coord13', '#ffff00', 1, 7);
    builder.addNode('coord21', '#00ff00', 4, 1);
    builder.addNode('coord24', '#0000ff', 4, 10);
    builder.addNode('coord31', '#7f007f', 7, 1);
    builder.addNode('coord34', '#00ffff', 7, 10);
    builder.addNode('coord42', '#d01f90', 10, 4);
    builder.addNode('coord43', '#ff00ff', 10, 7);
    builder.addPermutation('#7f007f', [[2, 4, 6, 7, 5, 3, 1, 0]]);
    builder.addPermutation('#ffff00', [[0, 6]]);
    builder.addPermutation('#00ffff', [[2, 3]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAM.puz
function AAM()
{
    var builder = new PuzzleBuilder('puzzles/AAM');

    builder.addNode('top', '#ffff00', 4, 1);
    builder.addNode('mid', '#ff0000', 4, 4);
    builder.addNode('lhs', '#0000ff', 1, 7);
    builder.addNode('rhs', '#00ff00', 7, 7);
    builder.addPermutation('#ff0000', [[0, 3, 1]]);
    builder.addPermutation('#00ff00', [[0, 1, 2]]);
    builder.addPermutation('#0000ff', [[2, 1, 3]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAP.puz
function AAP()
{
    var builder = new PuzzleBuilder('puzzles/AAP');

    builder.addNode('coord11', '#ff0000', 1, 1);
    builder.addNode('coord12', '#ffff00', 1, 4);
    builder.addNode('coord13', '#00ff00', 1, 7);
    builder.addNode('coord22', '#0000ff', 4, 4);
    builder.addNode('coord31', '#7f007f', 7, 1);
    builder.addNode('coord32', '#00ffff', 7, 4);
    builder.addNode('coord33', '#9acd31', 7, 7);
    builder.addPermutation('#ffff00', [[1, 3], [4, 5]]);
    builder.addPermutation('#00ff00', [[1, 2], [5, 6]]);
    builder.addPermutation('#0000ff', [[0, 1], [3, 5]]);
    builder.addCircleArc('#ffff00', 'coord12', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord22', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord31', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'coord32', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'coord12', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord13', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'coord32', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'coord33', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord11', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord12', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'coord22', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'coord32', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAF.puz
function AAF()
{
    var builder = new PuzzleBuilder('puzzles/AAF');

    builder.addNode('ul', '#ff0000', 1, 1);
    builder.addNode('ur', '#ffff00', 4, 1);
    builder.addNode('bl', '#0000ff', 1, 4);
    builder.addNode('br', '#00ff00', 4, 4);
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

    return builder.getPuzzleData();
}



// puzzles/ABO.puz
function ABO()
{
    var builder = new PuzzleBuilder('puzzles/ABO');

    builder.addNode('p1', '#7f007f', -0.0000, -2.0000);
    builder.addNode('p2', '#7f007f', 2.0000, 0.0000);
    builder.addNode('p3', '#7f007f', 0.0000, 2.0000);
    builder.addNode('p4', '#7f007f', -2.0000, 0.0000);
    builder.addNode('p5', '#ff0000', -0.0000, -5.0000);
    builder.addNode('p6', '#ffff00', 5.0000, 0.0000);
    builder.addNode('p7', '#ffff00', 9.0000, 0.0000);
    builder.addNode('p8', '#00ff00', 0.0000, 5.0000);
    builder.addNode('p9', '#00ff00', -1.7321, 8.0000);
    builder.addNode('p10', '#00ff00', 1.7321, 8.0000);
    builder.addNode('p11', '#0000ff', -5.0000, 0.0000);
    builder.addNode('p12', '#0000ff', -7.0000, -2.0000);
    builder.addNode('p13', '#0000ff', -9.0000, 0.0000);
    builder.addNode('p14', '#0000ff', -7.0000, 2.0000);
    builder.addPermutation('#ff0000', [[0, 3, 2, 1], [5, 6], [7, 8, 9], [10, 11, 12, 13]]);
    builder.addPermutation('#00ff00', [[0, 4], [1, 5], [2, 7], [3, 10]]);
    builder.addCircleArc('#ff0000', 'p1', 2.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p4', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p3', 2.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p2', 2.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p1', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'p5', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p2', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p6', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p3', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p8', 2.2, true, false, true);
    builder.addCircleArc('#00ff00', 'p4', 2.2, true, false, false);
    builder.addCircleArc('#00ff00', 'p11', 2.2, true, false, false);
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

    return builder.getPuzzleData();
}



// puzzles/ACD.puz
function ACD()
{
    var builder = new PuzzleBuilder('puzzles/ACD');

    builder.addNode('p1', '#ff0000', -1.5000, 0.8660);
    builder.addNode('p2', '#ffff00', -3.5000, 0.8660);
    builder.addNode('p3', '#0000ff', -3.5000, 4.3301);
    builder.addNode('p4', '#00ff00', -1.5000, 4.3301);
    builder.addNode('p5', '#ff0000', 1.5000, 0.8660);
    builder.addNode('p6', '#ffff00', 2.5000, 2.5981);
    builder.addNode('p7', '#0000ff', 5.5000, 0.8660);
    builder.addNode('p8', '#00ff00', 4.5000, -0.8660);
    builder.addNode('p9', '#ff0000', -0.0000, -1.7321);
    builder.addNode('p10', '#ffff00', 1.0000, -3.4641);
    builder.addNode('p11', '#0000ff', -2.0000, -5.1962);
    builder.addNode('p12', '#00ff00', -3.0000, -3.4641);
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

    return builder.getPuzzleData();
}



// puzzles/ABT.puz
function ABT()
{
    var builder = new PuzzleBuilder('puzzles/ABT');

    builder.addNode('p1', '#ffff00', 0.0000, 0.0000);
    builder.addNode('p2', '#ffff00', -3.0000, -0.0000);
    builder.addNode('p3', '#ff0000', 1.5000, 2.5981);
    builder.addNode('p4', '#00ff00', 1.5000, -2.5981);
    builder.addNode('p5', '#ff0000', -4.5000, 2.5981);
    builder.addNode('p6', '#ff0000', 4.5000, 2.5981);
    builder.addNode('p7', '#0000ff', -0.0000, -5.1962);
    builder.addPermutation('#ff0000', [[0, 2], [3, 6]]);
    builder.addPermutation('#00ff00', [[0, 3], [1, 4]]);
    builder.addPermutation('#0000ff', [[0, 1], [2, 5]]);
    builder.addCircleArc('#ff0000', 'p1', 3.0, false, true, false);
    builder.addCircleArc('#ff0000', 'p3', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p4', 3.0, false, false, false);
    builder.addCircleArc('#ff0000', 'p7', 3.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p1', 3.0, false, false, false);
    builder.addCircleArc('#00ff00', 'p4', 3.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p2', 3.0, false, true, false);
    builder.addCircleArc('#00ff00', 'p5', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p1', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p2', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p3', 3.0, false, false, false);
    builder.addCircleArc('#0000ff', 'p6', 3.0, false, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABK.puz
function ABK()
{
    var builder = new PuzzleBuilder('puzzles/ABK');

    builder.addNode('p1', '#7f007f', -0.5000, 2.5981);
    builder.addNode('p2', '#7f007f', -0.5000, -2.5981);
    builder.addNode('p3', '#ff0000', -5.0000, -0.0000);
    builder.addNode('p4', '#0000ff', 4.0000, 0.0000);
    builder.addNode('p5', '#ff0000', -3.0000, 1.7321);
    builder.addNode('p6', '#0000ff', 1.5000, 0.8660);
    builder.addNode('p7', '#7f007f', 0.0000, 0.0000);
    builder.addNode('p8', '#0000ff', 1.5000, -0.8660);
    builder.addNode('p9', '#ff0000', -3.0000, -1.7321);
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

    return builder.getPuzzleData();
}



// puzzles/ABJ.puz
function ABJ()
{
    var builder = new PuzzleBuilder('puzzles/ABJ');

    builder.addNode('r1c3', '#ff0000', 7, 1);
    builder.addNode('r1c6', '#ff0000', 16, 1);
    builder.addNode('r2c4', '#ffff00', 10, 4);
    builder.addNode('r2c5', '#ffff00', 13, 4);
    builder.addNode('r3c4', '#00ff00', 10, 7);
    builder.addNode('r3c5', '#00ff00', 13, 7);
    builder.addNode('r4c3', '#00ffff', 7, 10);
    builder.addNode('r4c6', '#00ffff', 16, 10);
    builder.addNode('r5c1', '#0000ff', 1, 13);
    builder.addNode('r5c2', '#0000ff', 4, 13);
    builder.addNode('r5c4', '#0000ff', 10, 13);
    builder.addNode('r5c5', '#0000ff', 13, 13);
    builder.addNode('r5c7', '#0000ff', 19, 13);
    builder.addNode('r5c8', '#0000ff', 22, 13);
    builder.addNode('r6c3', '#ff00ff', 7, 16);
    builder.addNode('r6c6', '#ff00ff', 16, 16);
    builder.addNode('r7c3', '#7f007f', 7, 19);
    builder.addNode('r7c6', '#7f007f', 16, 19);
    builder.addPermutation('#ff0000', [[10, 6, 4, 5, 7, 11]]);
    builder.addPermutation('#00ff00', [[10, 14, 9, 6], [4, 2, 3, 5], [11, 7, 12, 15]]);
    builder.addPermutation('#0000ff', [[14, 16], [9, 8], [2, 0], [3, 1], [12, 13], [15, 17]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAE.puz
function AAE()
{
    var builder = new PuzzleBuilder('puzzles/AAE');

    builder.addNode('ul', '#ff0000', 1, 1);
    builder.addNode('ur', '#ffff00', 4, 1);
    builder.addNode('bl', '#0000ff', 1, 4);
    builder.addNode('br', '#00ff00', 4, 4);
    builder.addPermutation('#ff0000', [[0, 2], [1, 3]]);
    builder.addPermutation('#0000ff', [[0, 1], [2, 3]]);
    builder.addCircleArc('#ff0000', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'bl', 2.2, true, false, true);
    builder.addCircleArc('#ff0000', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'br', 2.2, true, false, true);
    builder.addCircleArc('#0000ff', 'ul', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'ur', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'bl', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'br', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABB.puz
function ABB()
{
    var builder = new PuzzleBuilder('puzzles/ABB');

    builder.addNode('r1c2', '#7f7f7f', 1, 4);
    builder.addNode('r1c3', '#7f7f7f', 1, 7);
    builder.addNode('r1c5', '#7f7f7f', 1, 13);
    builder.addNode('r1c6', '#0000ff', 1, 16);
    builder.addNode('r2c1', '#00ff00', 4, 1);
    builder.addNode('r2c2', '#7f7f7f', 4, 4);
    builder.addNode('r2c3', '#7f7f7f', 4, 7);
    builder.addNode('r2c4', '#7f7f7f', 4, 10);
    builder.addNode('r2c5', '#7f7f7f', 4, 13);
    builder.addNode('r2c6', '#7f7f7f', 4, 16);
    builder.addNode('r2c7', '#7f7f7f', 4, 19);
    builder.addNode('r3c1', '#7f7f7f', 7, 1);
    builder.addNode('r3c2', '#7f7f7f', 7, 4);
    builder.addNode('r3c3', '#7f7f7f', 7, 7);
    builder.addNode('r3c4', '#7f7f7f', 7, 10);
    builder.addNode('r3c5', '#7f7f7f', 7, 13);
    builder.addNode('r3c6', '#7f7f7f', 7, 16);
    builder.addNode('r3c7', '#7f7f7f', 7, 19);
    builder.addNode('r4c2', '#7f7f7f', 10, 4);
    builder.addNode('r4c3', '#7f7f7f', 10, 7);
    builder.addNode('r4c5', '#7f7f7f', 10, 13);
    builder.addNode('r4c6', '#7f7f7f', 10, 16);
    builder.addNode('r5c1', '#7f7f7f', 13, 1);
    builder.addNode('r5c2', '#7f7f7f', 13, 4);
    builder.addNode('r5c3', '#7f7f7f', 13, 7);
    builder.addNode('r5c4', '#7f7f7f', 13, 10);
    builder.addNode('r5c5', '#7f7f7f', 13, 13);
    builder.addNode('r5c6', '#7f7f7f', 13, 16);
    builder.addNode('r5c7', '#7f7f7f', 13, 19);
    builder.addNode('r6c1', '#7f7f7f', 16, 1);
    builder.addNode('r6c2', '#7f7f7f', 16, 4);
    builder.addNode('r6c3', '#7f7f7f', 16, 7);
    builder.addNode('r6c4', '#7f7f7f', 16, 10);
    builder.addNode('r6c5', '#7f7f7f', 16, 13);
    builder.addNode('r6c6', '#7f7f7f', 16, 16);
    builder.addNode('r6c7', '#ff0000', 16, 19);
    builder.addNode('r7c2', '#7f007f', 19, 4);
    builder.addNode('r7c3', '#7f7f7f', 19, 7);
    builder.addNode('r7c5', '#7f7f7f', 19, 13);
    builder.addNode('r7c6', '#7f7f7f', 19, 16);
    builder.addPermutation('#ff0000', [[7, 8], [15, 16], [26, 27], [0, 5], [12, 18], [23, 30], [6, 13], [19, 24], [31, 37], [25, 32], [33, 38], [3, 9], [34, 39], [10, 17], [28, 35]]);
    builder.addPermutation('#7f007f', [[2, 3], [4, 5], [6, 7], [11, 12], [13, 14], [18, 19], [20, 21], [23, 24], [29, 30], [31, 32], [36, 37], [8, 15], [26, 33], [9, 16], [27, 34]]);
    builder.addPermutation('#00ff00', [[9, 10], [14, 15], [22, 23], [24, 25], [27, 28], [30, 31], [32, 33], [34, 35], [38, 39], [5, 12], [1, 6], [13, 19], [2, 8], [20, 26], [16, 21]]);
    builder.addPermutation('#0000ff', [[0, 1], [5, 6], [8, 9], [12, 13], [16, 17], [25, 26], [33, 34], [4, 11], [22, 29], [18, 23], [30, 36], [24, 31], [7, 14], [15, 20], [21, 27]]);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABW.puz
function ABW()
{
    var builder = new PuzzleBuilder('puzzles/ABW');

    builder.addNode('p1', '#7f007f', -2.2500, 1.2990);
    builder.addNode('p2', '#ffff00', 2.2500, 1.2990);
    builder.addNode('p3', '#00ffff', -0.0000, -2.5981);
    builder.addNode('p4', '#ff0000', -2.2500, 3.8971);
    builder.addNode('p5', '#ff0000', 2.2500, 3.8971);
    builder.addNode('p6', '#00ff00', 4.5000, 0.0000);
    builder.addNode('p7', '#00ff00', 2.2500, -3.8971);
    builder.addNode('p8', '#0000ff', -2.2500, -3.8971);
    builder.addNode('p9', '#0000ff', -4.5000, -0.0000);
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

    return builder.getPuzzleData();
}



// puzzles/AAA.puz
function AAA()
{
    var builder = new PuzzleBuilder('puzzles/AAA');

    builder.addNode('lhs', '#ff0000', 1, 1);
    builder.addNode('rhs', '#0000ff', 4, 1);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'rhs', 2.2, true, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABQ.puz
function ABQ()
{
    var builder = new PuzzleBuilder('puzzles/ABQ');

    builder.addNode('p1', '#ff0000', -6.0000, -0.0000);
    builder.addNode('p2', '#0000ff', -4.5000, 2.5981);
    builder.addNode('p3', '#ff0000', -3.0000, -0.0000);
    builder.addNode('p4', '#0000ff', -1.5000, 2.5981);
    builder.addNode('p5', '#ff0000', 0.0000, 0.0000);
    builder.addNode('p6', '#0000ff', 1.5000, 2.5981);
    builder.addNode('p7', '#ff0000', 3.0000, 0.0000);
    builder.addNode('p8', '#0000ff', 4.5000, 2.5981);
    builder.addNode('p9', '#ff0000', 6.0000, 0.0000);
    builder.addNode('p10', '#7f007f', 0.0000, 5.1962);
    builder.addNode('p11', '#7f007f', -0.0000, -3.4641);
    builder.addPermutation('#ff0000', [[0, 1], [2, 3], [4, 5], [6, 7]]);
    builder.addPermutation('#0000ff', [[1, 2], [3, 4], [5, 6], [7, 8]]);
    builder.addPermutation('#7f007f', [[9, 7, 5, 3, 1], [0, 2, 4, 6, 8, 10]]);
    builder.addCircleArc('#7f007f', 'p2', 5.19615242271, false, false, false);
    builder.addCircleArc('#7f007f', 'p10', 5.19615242271, false, false, false);
    builder.addCircleArc('#7f007f', 'p9', 6.92820323028, false, false, false);
    builder.addCircleArc('#7f007f', 'p11', 6.92820323028, false, false, false);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/AAC.puz
function AAC()
{
    var builder = new PuzzleBuilder('puzzles/AAC');

    builder.addNode('lhs', '#ff0000', 1, 1);
    builder.addNode('mid', '#ffff00', 4, 1);
    builder.addNode('rhs', '#0000ff', 7, 1);
    builder.addNode('bot', '#00ff00', 4, 4);
    builder.addPermutation('#ff0000', [[0, 1]]);
    builder.addPermutation('#ffff00', [[1, 2]]);
    builder.addPermutation('#0000ff', [[1, 3]]);
    builder.addCircleArc('#ff0000', 'lhs', 2.2, true, false, false);
    builder.addCircleArc('#ff0000', 'mid', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'mid', 2.2, true, false, false);
    builder.addCircleArc('#ffff00', 'rhs', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'mid', 2.2, true, false, false);
    builder.addCircleArc('#0000ff', 'bot', 2.2, true, false, true);

    builder.recenter();
    builder.normalize();

    return builder.getPuzzleData();
}



// puzzles/ABS.puz
function ABS()
{
    var builder = new PuzzleBuilder('puzzles/ABS');

    builder.addNode('p1', '#ff0000', -3.5000, 0.0000);
    builder.addNode('p2', '#ff0000', 1.7500, 3.0311);
    builder.addNode('p3', '#ff0000', 1.7500, -3.0311);
    builder.addNode('p4', '#ffff00', -5.5000, 0.0000);
    builder.addNode('p5', '#ffff00', -8.0000, -4.3301);
    builder.addNode('p6', '#ffff00', -13.0000, -4.3301);
    builder.addNode('p7', '#ffff00', -15.5000, 0.0000);
    builder.addNode('p8', '#ffff00', -13.0000, 4.3301);
    builder.addNode('p9', '#ffff00', -8.0000, 4.3301);
    builder.addNode('p10', '#00ff00', 2.7500, 4.7631);
    builder.addNode('p11', '#00ff00', 0.2500, 9.0933);
    builder.addNode('p12', '#00ff00', 2.7500, 13.4234);
    builder.addNode('p13', '#00ff00', 7.7500, 13.4234);
    builder.addNode('p14', '#00ff00', 10.2500, 9.0933);
    builder.addNode('p15', '#00ff00', 7.7500, 4.7631);
    builder.addNode('p16', '#00ffff', 2.7500, -4.7631);
    builder.addNode('p17', '#00ffff', 7.7500, -4.7631);
    builder.addNode('p18', '#00ffff', 10.2500, -9.0933);
    builder.addNode('p19', '#00ffff', 7.7500, -13.4234);
    builder.addNode('p20', '#00ffff', 2.7500, -13.4234);
    builder.addNode('p21', '#00ffff', 0.2500, -9.0933);
    builder.addNode('p22', '#0000ff', -14.0000, -6.0622);
    builder.addNode('p23', '#0000ff', -14.0000, -12.1244);
    builder.addNode('p24', '#0000ff', -19.2500, -9.0933);
    builder.addNode('p25', '#7f007f', -14.0000, 6.0622);
    builder.addNode('p26', '#7f007f', -19.2500, 9.0933);
    builder.addNode('p27', '#7f007f', -14.0000, 12.1244);
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
    builder.addCircleArc('#00ff00', 'p1', 1.8, false, false, false);
    builder.addCircleArc('#00ff00', 'p4', 1.8, false, false, false);
    builder.addCircleArc('#00ff00', 'p2', 1.8, false, true, false);
    builder.addCircleArc('#00ff00', 'p10', 1.8, false, false, false);
    builder.addCircleArc('#00ff00', 'p3', 1.8, false, false, false);
    builder.addCircleArc('#00ff00', 'p16', 1.8, false, true, false);
    builder.addCircleArc('#00ff00', 'p6', 1.8, false, false, false);
    builder.addCircleArc('#00ff00', 'p22', 1.8, false, true, false);
    builder.addCircleArc('#00ff00', 'p8', 1.8, false, true, false);
    builder.addCircleArc('#00ff00', 'p25', 1.8, false, false, false);
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

    return builder.getPuzzleData();
}



puzzleList = [AAA(), AAB(), AAC(), AAD(), AAE(), AAF(), AAG(), AAH(), AAI(), AAJ(), AAK(), AAL(), AAM(), AAN(), AAO(), AAP(), AAQ(), AAR(), AAS(), AAT(), AAU(), AAV(), AAW(), AAX(), AAY(), AAZ(), ABA(), ABB(), ABC(), ABD(), ABE(), ABF(), ABG(), ABH(), ABI(), ABJ(), ABK(), ABL(), ABM(), ABN(), ABO(), ABP(), ABQ(), ABR(), ABS(), ABT(), ABU(), ABV(), ABW(), ABX(), ABY(), ABZ(), ACA(), ACB(), ACC(), ACD(), ACE(), E1()];
puzzleIndex = 0;
puzzleData = puzzleList[puzzleIndex];

main();
