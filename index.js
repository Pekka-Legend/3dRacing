//CURRENT WORK - add a graphic for checkpoints, add names to levels
//TODO make levels
//TODO add different drifting speeds and test on different size maps
//TODO add a garage with different cars

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
canvas.width = 1536 / 1.2
canvas.height = 729 / 1.2


const FOV = .5 * Math.PI
const RES = 1
var lap = 1
var checkpoints = 0
var mousedown = false
var mousepos = {x: 0, y: 0}
var activeEditTile = 0
var activeEditProp = 0
var activeEditMode = 0
var startDir = 0
var lapCount = 3
var boost = 0
var maxBoost = 100

var testList = [1, 2, 3]

var driveMode = 0

var floor = 0
var sky = 2

var ghostWritingString = ""
var ghostRacingString = ""
var ghostReadIndex = 0

var currentTimer = 0
var endTime = 0
var startRaceTime = Date.now()
var levelType = 0 //0 is user level, 1 is imported level

var currentSaveIndex = 0

var racingGhost = false

//types- 0: asphalt, 1: mud, 2: alien
var floorTypes = [
    {
        friction: 1,
        color: "darkgrey"
},
{
        friction: .5,
        color: "rgb(92, 64, 51)"
},
{
    friction: 1.2,
    color: 'green'
}
]

var skyTypes = ['skyblue', 'navy', 'dimgrey']


var commonOffset = canvas.width / 2.5 / 10

var checkpointPositions = [] //continue here. Store the checkpoint positions in this list so that I can easily reactivate them

var menu = 2 //0: race, 1: level editor, 2: main menu, 3: end race menu

var spriteSheet = new Image()
spriteSheet.src = 'spritesheet.png'

map = [ //0: Blank tile, 1: American Flag, 2: Normal Wall, -1: Start/Finish Line, -2/-3: Unclaimed/Claimed Checkpoint
    [2, 1, 1, 1, 2, 2, 2, 2, 2, 2], 
    [2, 0, 0, 0, 2, 2, 2, 2, 2, 2], 
    [2, 0, 0, 0, 2, 2, 0, 0, 0, 2], 
    [2, 0, 2, 0, 2, 2, 0, 0, 0, 2], 
    [2, 0, 2, -2, 2, 2, 0, 2, -2, 2], 
    [2, 0, 2, 0, 0, 0, 0, 2, 0, 2], 
    [2, 0, 2, 0, 0, 0, 0, 2, 0, 2], 
    [2, 0, 2, 2, 2, 2, 2, 2, 0, 2], 
    [2, 0, 0, 0, 0, 0, -1, 0, 0, 2], 
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
]


function changeMapSize(size)
{
    if (size > 50)
    {
        size = 50
    }
    if (size < 10)
    {
        size = 10
    }
    map = []
    for (var i = 0; i < size; i++)
    {
        map.push([])
        for (var j = 0; j < size; j++)
        {
            if (j == 0 || j == size - 1 || i == 0 || i == size - 1)
            {
                map[i].push(2)
            }
            else
            {
                map[i].push(0)
            }
        }
    }
    tileSize = (canvas.width * .25) / map.length
    ts = (canvas.width / 2.5) / map.length // editor tile size
    props.cones = []
    props.tires = []

}

tileSize = (canvas.width * .25) / map.length //NEVER round this value for calculations, it messes up the raycast function and makes the rays clip through corners
offsetNum = tileSize / 64

var ts = (canvas.width / 2.5) / map.length // editor tile size
var keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    shift: false,
    space: false,
}

class Player
{
    constructor()
    {
        this.x = 6 * tileSize + tileSize / 2
        this.y = 8 * tileSize + tileSize / 2
        this.speed = 0
        this.topSpeed = 480 / tileSize
        this.currentTopSpeed = this.topSpeed
        this.acceleration = 300 / tileSize
        this.turnSpeed = 20
        this.direction = Math.PI * 1.5
        this.radius = tileSize / 10
        this.previousX = 0
        this.previousY = 0
        this.driftPower = .75
        this.boostModifier = 2
        this.boostCollectionRate = .03
    }
    draw()
    {
        c.fillStyle = 'yellow'
        c.beginPath()
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        c.fill()

        c.beginPath()
        c.strokeStyle = 'yellow'
        c.lineWidth = tileSize / 10
        c.moveTo(this.x, this.y)
        c.lineTo(this.x + (-Math.sin(this.direction) * tileSize / 5), this.y + (Math.cos(this.direction) * tileSize / 5))
        c.stroke()

    }
    update()
    {
        this.topSpeed = .33 * tileSize
        this.acceleration = .2 * tileSize
        this.radius = tileSize / 10
        if (keys.space == true)
        {
            if (boost > 0)
            {
                boost -= .5
                this.currentTopSpeed = this.topSpeed * this.boostModifier
                this.speed = this.currentTopSpeed
            }
        }
        else
        {
            this.currentTopSpeed = this.topSpeed
        }
        if (boost > maxBoost)
        {
            boost = maxBoost
        }
        if (boost < 0)
        {
            boost = 0
        }
        if (keys.w == true)
        {
            this.speed += this.acceleration * dt * floorTypes[floor].friction
        }
        if (this.speed > this.currentTopSpeed)
        {
            this.speed = this.currentTopSpeed
        }
        else if (keys.w != true)//neither forward nor back are pressed, lose speed gradually
        {
            if (this.speed > 0)
            {
                this.speed -= .3 * dt * floorTypes[floor].friction * tileSize
            }
            else if (this.speed < 0)
            {
                this.speed += .3 * dt * floorTypes[floor].friction * tileSize
            }

            if (Math.abs(this.speed) < .3)
            {
                this.speed = 0
            }
        }
        if (keys.a == true)
        {

            this.direction -= .1 * dt * this.turnSpeed
            if (!keys.shift)
            {
                if (this.speed > (1 / floorTypes[floor].friction) / 15 * floorTypes[floor].friction * floorTypes[floor].friction)
                {
                    this.speed -= (1 / floorTypes[floor].friction) / 15 * floorTypes[floor].friction * floorTypes[floor].friction * 8 / map.length
                }
                if (this.direction < 0)
                {
                    this.direction = 6.28
                }
            }
            
        }
        if (keys.d == true)
        {

            this.direction += .1 * dt * this.turnSpeed
            if (!keys.shift)
            {
                if (this.speed > (1 / floorTypes[floor].friction) / 15 * floorTypes[floor].friction * floorTypes[floor].friction)
                {
                    this.speed -= (1 / floorTypes[floor].friction) / 15 * floorTypes[floor].friction * floorTypes[floor].friction * 8 / map.length
                }
                if (this.direction > 6.28)
                {
                    this.direction = 0
                }
            }
            
        }
        

        //player movement
        for (var i = 0; i < this.speed; i++)
        {
            this.x += -Math.sin(this.direction) * dt * 10

            if (keys.shift && keys.a && keys.d == false)//boost only included here because I only want it added once per frame ***
            {
                this.x -= Math.cos(this.direction) * this.speed * dt * this.driftPower
                if (boost < maxBoost - 2)
                {
                    boost += this.boostCollectionRate * map.length / 10
                }
                
            }
            if (keys.shift && keys.d && keys.a == false)//***
            {
                this.x += Math.cos(this.direction) * this.speed * dt * this.driftPower
                if (boost < maxBoost - 2)
                {
                    boost += this.boostCollectionRate * map.length / 10
                }
                
            }
                

            let testX = Math.floor(this.x / (tileSize))
            let testY = Math.floor(this.y / (tileSize))
            if (map[testY][testX] > 0) //if the tile you are in is solid
            {
                c.fillStyle = 'red'
                c.fillRect(Math.floor(this.x / (tileSize)) * tileSize, Math.floor(this.y / (tileSize)) * tileSize, tileSize, tileSize)
                while(map[testY][testX] > 0)
                {
                    this.x -= -Math.sin(this.direction) * dt
                    if (keys.shift && keys.a)
                    {
                        this.x += (Math.cos(this.direction) * this.speed * dt * this.driftPower) / 10
                    }
                    if (keys.shift && keys.d)
                    {
                        this.x -= (Math.cos(this.direction) * this.speed * dt * this.driftPower) / 10
                    }
                    testX = Math.floor(this.x / (tileSize))
                }
                this.speed -= .1
            
            }

            this.y += Math.cos(this.direction) * dt * 10

            if (keys.shift && keys.a)
            {
                this.y -= Math.sin(this.direction) * this.speed * dt * this.driftPower
            }
            if (keys.shift && keys.d)
            {
                this.y += Math.sin(this.direction) * this.speed * dt * this.driftPower
            }

            testX = Math.floor(this.x / (tileSize))
            testY = Math.floor(this.y / (tileSize))
            if (map[testY][testX] > 0) //if the tile you are in is solid
            {
                c.fillStyle = 'red'
                c.fillRect(Math.floor(this.x / (tileSize)) * tileSize, Math.floor(this.y / (tileSize)) * tileSize, tileSize, tileSize)
                while(map[testY][testX] > 0)
                {
                    this.y -= Math.cos(this.direction) * dt
                    if (keys.shift && keys.a)
                    {
                        this.y += (Math.sin(this.direction) * this.speed * dt * this.driftPower) / 10
                    }
                    if (keys.shift && keys.d)
                    {
                        this.y -= (Math.sin(this.direction) * this.speed * dt * this.driftPower) / 10
                    }
                    testY = Math.floor(this.y / (tileSize))
                }

                this.speed -= .1
            
            }
            

            //check for collisions with cones
            let coneWidth = 5
            props.cones.forEach(cone =>{
                if (cone.active && this.x >= cone.x - coneWidth / 2 && this.y >= cone.y - coneWidth / 2 && this.x <= cone.x + coneWidth / 2 && this.y <= cone.y + coneWidth / 2)
                {
                    this.speed = 0
                    cone.active = false
                }
            })
            this.doCheckpoints()
            let tireWidth = 5
            props.tires.forEach(tire =>{
                if (tire.active && this.x >= tire.x - tireWidth / 2 && this.y >= tire.y - tireWidth / 2 && this.x <= tire.x + tireWidth / 2 && this.y <= tire.y + tireWidth / 2)
                {
                    this.speed = 0
                    tire.active = false
                }
            })
        }
    }
    doCheckpoints()
    {
        let testX = Math.floor(this.x / (tileSize))
        let testY = Math.floor(this.y / (tileSize))
        if (map[testY][testX] == -2) //if the player is on an unclamied checkpoint, claim it and set the checkpoint as claimed
        {
            checkpoints++
            map[testY][testX] = -3
            checkpointPositions.push({x: testX, y: testY})
        }
        if (map[testY][testX] == -1 && checkpoints == 2) //if the player is on the finish line and they have all the checkpoints claimed
        {
            checkpoints = 0
            lap ++
            lFrame = 0
            shouldDecrease = false
            wFrame = 0
            checkpointPositions.forEach(cp =>{
                map[cp.y][cp.x] = -2
            })
            checkpointPositions = []
        }
    }
}

class Button
{
    constructor(x, y, width, height, text, color, hoverColor, fontColor, img = null)
    {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.text = text
        this.defaultColor = color
        this.fontColor = fontColor
        this.hoverColor = hoverColor
        this.color = this.defaultColor
        this.img = img * 64 //delete this if I want to use something that doesn't have an offset of 64

        this.fontSize = this.findBestTextSize()
    }
    findBestTextSize()
    {
        let fontSize = 250
        c.font = fontSize.toString() + "px Arcade Normal"
        let textSize = c.measureText(this.text)
        while (textSize.width >= this.width - 10 || (textSize.actualBoundingBoxAscent - textSize.actualBoundingBoxDescent) >= this.height - 10)
        {
            fontSize--
            c.font = fontSize.toString() + "px Arcade Normal"
            textSize = c.measureText(this.text)
        }
        return fontSize
    }
    draw()
    {
        c.fillStyle = this.color
        c.fillRect(this.x, this.y, this.width, this.height)
        
        if (this.fontColor == "")
        {
            this.fontColor = 'black'
        }
        if (this.text != "")
        {
            c.fillStyle = this.fontColor
            c.font = this.fontSize / 2.2 + "px Arcade Normal"
            let textSize = c.measureText(this.text)
            if (this.text == "Delete Ghost" || this.text == "Delete Level")
            {
                c.font = 35 + "px Arcade Normal"
                textSize = c.measureText(this.text)
            }
            let textHeight = textSize.actualBoundingBoxAscent - textSize.actualBoundingBoxDescent
            c.fillText(this.text, this.x + (this.width / 2) - (textSize.width / 2), this.y + (this.height / 2) + (textHeight / 2), this.width, this.height)
        }
        else
        {
            c.drawImage(spriteSheet, this.img + 1, 0, 62, 64, this.x + this.width / 10, this.y + this.height / 10, this.width - this.width / 5, this.height - this.height / 5)
        }
    }
    isClicked()
    {
        if (mousepos.x >= this.x && mousepos.x <= this.x + this.width && mousepos.y >= this.y && mousepos.y <= this.y + this.height)
        {
            this.color = this.hoverColor
            if (mousedown)
            {
                mousedown = false
                return true
            }
            
        }
        else
        {
            this.color = this.defaultColor
        }
        return false
    }
    changeText(newText)
    {
        this.text = newText
    }
}

class Prop
{
    constructor(x, y, type)
    {
        this.x = x
        this.y = y
        this.type = type
        this.distanceToPlayer = 0
        this.directionToPlayer = 0
        this.active = true
    }
    update()
    {
        if (this.active)
        {
            //find distance from player to prop
            this.distanceToPlayer = lengthOfSegment(player.x, player.y, this.x, this.y)

            //find direction from player to prop
            this.directionToPlayer = Math.atan2(player.x - this.x, this.y - player.y)
            
        }
        
    }
    draw(index)
    {
        //console.log(index)
        if (this.active)
        {
            let minDir = player.direction - FOV / 2
            let maxDir = player.direction + FOV / 2
            if (this.directionToPlayer < 0)
            {
                minDir -= 6.28
                maxDir -= 6.28
            }
            if (maxDir > Math.PI * 2)
            {
                this.directionToPlayer += Math.PI * 2
            }
            if (minDir < -Math.PI * 2)
            {
                this.directionToPlayer -= Math.PI * 2
            }
            //console.log(this.directionToPlayer.toString() + ", " + minDir.toString() + ", " + maxDir.toString())
            

            let sl = canvas.width / RES

            let dirDif = this.directionToPlayer - minDir

            //console.log(dirDif)
            let propScreenX = dirDif / (FOV / sl)
            
            let height = (4100 / this.distanceToPlayer)
            //console.log(propScreenX)
            if (this.type == "cone")
            {
                let hOffset = 1
                height *= hOffset
                let width = height
                //fix the showing underneath walls issue
                c.drawImage(spriteSheet, 0, 65, 63, 63, propScreenX - width / 2, canvas.height / 2 + 0 / hOffset / this.distanceToPlayer, width, height)
            
            }
            if (this.type == "tire")
            {
                let hOffset = 1
                height *= hOffset
                let width = height
                c.drawImage(spriteSheet, 66, 65, 61, 63, propScreenX - width / 2, canvas.height / 2 + 0 / hOffset / this.distanceToPlayer, width, height)
            }
            if (this.type == "finish")
            {
                if (checkpoints == 2)
                {
                    let hOffset = .05 * tileSize
                    height *= hOffset
                    let width = height
                    //fix the showing underneath walls issue
                    c.drawImage(spriteSheet, 130, 65, 60, 63, propScreenX - width / 2, canvas.height / 2 - height / 4, width, height)
                }
            }
            if (this.type == "ghost" && racingGhost && currentTimer > 2)
            {
                let hOffset = .05 * tileSize
                height *= hOffset
                let width = height
                c.drawImage(spriteSheet, 194, 65, 61, 63, propScreenX - width / 2, canvas.height / 2 - height / 4, width, height)
            }
        }  
        
    }
}

function intersectionOfLines(x_1, y_1, x_2, y_2, x_3, y_3, x_4, y_4)
{
    let x1 = x_1
    let y1 = y_1
    let x2 = x_2
    let y2 = y_2
    let x3 = x_3
    let y3 = y_3
    let x4 = x_4
    let y4 = y_4


    if (x1 == x2)//stops the slope from being undefined
    {
        x1 -= .0000001
    }
    if (x3 == x4)//stops the slope from being undefined
    {
        x3 -= .0000001
    }
    let slope1 = (y2 - y1) / (x2 - x1)
    let b1 = y1 - (slope1 * x1)
    let slope2 = (y4 - y3) / (x4 - x3)
    let b2 = y3 - (slope2 * x3)

    let deltaSlope = slope1 - slope2
    let deltaB = b2 - b1
    let intersectX = deltaB / deltaSlope
    let intersectY = (slope1 * intersectX) + b1
    return {
        x: intersectX,
        y: intersectY}
}
function lengthOfSegment(x1, y1, x2, y2)
{
    return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2))
}

function raycast(x, y, dir, i = 0, playerDir)
{
    let startX = x - -Math.sin(dir)
    let startY = y - Math.cos(dir)
    let tx = startX
    let ty = startY
    let direction = dir
    let columnx
    let columny
    let xIntCoords
    let yIntCoords
    
    let r = false //is player facing right
    let d = false //is player facing left
    let shouldExit = false
    let its = 0

    let returnCoords = {x: 0, y: 0, length: 0, idx: i, offset: 0, type: 0, trueLength: 0}

    if (direction < 0)
    {
        direction = Math.PI * 2 + direction
    }
    while(!shouldExit)
    {
        columnx = Math.floor((tx) / (tileSize))
        columny = Math.floor((ty) / (tileSize))

        r = false
        d = false
        if (direction >= Math.PI) //if facing right
        {
            columnx++
            r = true //if the player is facing right, the column is already correct because it is the same thing as the right of the current tile. I need this variable because if the player is facing left I have to subtract 1 from columnx so that it checks the right index on the map array
        }
        if (direction <= Math.PI * .5 || direction >= Math.PI * 1.5) //if facing down
        {
            columny++
            d = true //same thing as r, I don't feel like explaining it again here, just NEVER delete r or d
        }
        xIntCoords = intersectionOfLines(tx, ty, tx + -Math.sin(direction) * 2, ty + Math.cos(direction) * 2, columnx * tileSize -.00000001, 0, columnx * tileSize, 2) //find intersection of vertical line
        yIntCoords = intersectionOfLines(tx, ty, tx + -Math.sin(direction) * 2, ty + Math.cos(direction) * 2, 0, columny * tileSize, 1, columny * tileSize - .00000001) //find intersection of horizontal line
        
        let xMeasure = lengthOfSegment(tx, ty, xIntCoords.x, xIntCoords.y)
        let yMeasure = lengthOfSegment(tx, ty, yIntCoords.x, yIntCoords.y)
        if (xMeasure < yMeasure) //if the vertical intersection is closer than the horizontal intersection
        {
            if (map[Math.floor(xIntCoords.y / (tileSize))][columnx - !r] <= 0) //if the map tile is anything other than a wall
            {
                tx = xIntCoords.x
                ty = xIntCoords.y
                if (direction <= Math.PI)
                {
                    tx -= .00001
                }
            }
            else
            {
                returnCoords.offset = (xIntCoords.y - (Math.floor(xIntCoords.y / (tileSize))) * tileSize)
                returnCoords.offset = (63 / tileSize) * (returnCoords.offset)
                if (direction <= Math.PI) //invert the texture so it is facing the correct direction
                {
                    returnCoords.offset = 0 + (63 - returnCoords.offset)
                }
                returnCoords.length = 4000 / lengthOfSegment(startX, startY, xIntCoords.x, xIntCoords.y) //I could add * Math.cos(deltaDirection) but I like the fisheye effect
                returnCoords.type = map[Math.floor(xIntCoords.y / (tileSize))][columnx - !r]
                returnCoords.x = xIntCoords.x
                returnCoords.y = xIntCoords.y

                returnCoords.trueLength = lengthOfSegment(startX, startY, xIntCoords.x, xIntCoords.y)
                
                shouldExit = true
            }
        }
        else if (yMeasure <= xMeasure) //if the horizontal intersection is closer than the vertical intersection
        {
            if (map[columny - !d][Math.floor(yIntCoords.x / (tileSize))] <= 0) //
            {
                tx = yIntCoords.x
                ty = yIntCoords.y
                if (direction <= Math.PI * .5 || direction >= Math.PI * 1.5)
                {
                    ty += .00001
                }
            }
            else
            {
                returnCoords.offset = (yIntCoords.x - (Math.floor(yIntCoords.x / (tileSize))) * tileSize)
                returnCoords.offset = (63 / tileSize) * (returnCoords.offset)
                if (direction <= Math.PI * .5 || direction >= Math.PI * 1.5) //invert the texture so it is facing the correct direction
                {
                    returnCoords.offset = 0 + (63 - returnCoords.offset)
                }
                returnCoords.length = 4000 / lengthOfSegment(startX, startY, yIntCoords.x, yIntCoords.y) //I could add * Math.cos(deltaDirection) but I like the fisheye effect
                returnCoords.type = map[columny - !d][Math.floor(yIntCoords.x / (tileSize))]
                returnCoords.x = yIntCoords.x
                returnCoords.y = yIntCoords.y
                
                returnCoords.trueLength = lengthOfSegment(startX, startY, yIntCoords.x, yIntCoords.y)

                shouldExit = true
            }
        }
        if (its > 100)
        {
            shouldExit = true
        }
        its++
    }
    returnCoords.length /=  1 / tileSize
    returnCoords.length /= 38.4
    return returnCoords
}

function drawMap()
{
    for (var i = 0; i < map.length; i++)
    {
        for (var j = 0; j < map.length; j++)
        {
            if (map[i][j] == 1)
            {
                c.fillStyle = 'blue'
            }
            else if (map[i][j] == 2)
            {
                c.fillStyle = 'white' 
            }
            else if (map[i][j] == 3)
            {
                c.fillStyle = 'brown'
            }
            else if (map[i][j] == -1)
            {
                c.fillStyle = 'limegreen'
            }
            else if (map[i][j] == -2)
            {
                c.fillStyle = 'yellow'
            }
            else
            {
                c.fillStyle = floorTypes[floor].color
            }
            c.fillRect(j * tileSize, i * tileSize, tileSize, tileSize)
            
            props.cones.forEach(cone =>{
                if (cone.active)
                {
                    c.fillStyle = 'orange'
                    c.fillRect(cone.x - tileSize / 40, cone.y - tileSize / 40, tileSize / 20, tileSize / 20)
                }
                
            })
            props.tires.forEach(tire =>{
                if (tire.active)
                {
                    c.fillStyle = 'black'
                    c.fillRect(tire.x - tileSize / 40, tire.y - tileSize / 40, tileSize / 20, tileSize / 20)
                }
            })
            
        }
    }
}

function drawEditorMap()
{
    let ts = (canvas.width / 2.5) / map.length
    let ms = ts * map.length
    for (var i = 0; i < map.length; i++)
    {
        for (var j = 0; j < map.length; j++)
        {
            if (map[i][j] == 1)
            {
                c.fillStyle = 'blue'
            }
            else if (map[i][j] == 2)
            {
                c.fillStyle = 'white' 
            }
            else if (map[i][j] == 3)
            {
                c.fillStyle = 'brown'
            }
            else if (map[i][j] == -1)
            {
                c.fillStyle = 'limegreen'
            }
            else if (map[i][j] == -2)
            {
                c.fillStyle = 'yellow'
            }
            else
            {
                c.fillStyle = floorTypes[floor].color
            }
            c.fillRect(j * ts + canvas.width / 25, i * ts + canvas.height / 2 - ms / 2, ts, ts)
            if (map[i][j] == -1)
            {
                drawArrow(j * ts + canvas.width / 25 + ts / 2, i * ts + canvas.height / 2 - (ts * map.length) / 2 + ts / 2, ts - 2, startDir, 'black', 2)
            }
        }
    }
    props.cones.forEach(cone =>{
        c.fillStyle = 'orange'
        c.fillRect(((cone.x) / (tileSize / ts) - ts / 40) + canvas.width / 25, (cone.y * (ts / tileSize) - ts / 40) + (canvas.height / 2 - (ts * map.length) / 2), ts / 20, ts / 20)
    })
    props.tires.forEach(tire =>{
        c.fillStyle = 'black'
        c.fillRect(((tire.x) / (tileSize / ts) - ts / 40) + canvas.width / 25, (tire.y * (ts / tileSize) - ts / 40) + (canvas.height / 2 - (ts * map.length) / 2), ts / 20, ts / 20)
    })
}
function editMap()
{
    if (activeEditMode != 0)
    {
        return
    }
    if (checkpointPositions != []) //if some checkpoints are claimed, unclaim them
    {
        checkpointPositions.forEach(checkpoint =>{
            map[checkpoint.y][checkpoint.x] = -2
            
        })
        checkpointPositions = []
    }
    if (mousedown && mousepos.x >= 0 && mousepos.y >= 0 && (mousepos.x - canvas.width / 25) / ts <= map.length && (mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / ts <= map.length)
    {
        let cpPos = []
        if (activeEditTile == -2)
        {
            
            for (var i = 0; i < map.length; i++)
            {
                for (var j = 0; j < map.length; j++)
                {
                    if (map[j][i] == -2)
                    {
                        cpPos.push({x: i, y: j})
                    }
                }
            }       
        }
        if (cpPos.length >= 2)
        {
            map[cpPos[0].y][cpPos[0].x] = 0
            mousedown = false
        }

        //stops the user from erasing the edge of the map, they can edit it, but not remove it
        if (activeEditTile == 0)
        {
            if (Math.floor((mousepos.x - canvas.width / 25) / ts) == 0 || Math.floor((mousepos.x - canvas.width / 25) / ts) == map.length - 1 || Math.floor((mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / ts) == 0 || Math.floor((mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / ts) == map.length - 1)
            {
                return;
            }
        }
        if (activeEditTile == -1)
        {
            for (var i = 0; i < map.length; i++)
            {
                for (var j = 0; j < map.length; j++)
                {
                    if (map[j][i] == -1)
                    {
                        map[j][i] = 0
                    }
                }
            }
        }
        map[Math.floor((mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / ts)][Math.floor((mousepos.x - canvas.width / 25) / ts)] = activeEditTile
        var i = 0

    }
}

function editMapProps()
{
    if (activeEditProp == -1 && mousedown)
    {
        var i = 0
        props.cones.forEach(cone =>{
        
            if (mousepos.x >= ((cone.x) / (tileSize / ts) - ts / 40) + canvas.width / 25 && mousepos.y >= (cone.y * (ts / tileSize) - ts / 40) + (canvas.height / 2 - (ts * map.length) / 2) && mousepos.x <= ((cone.x) / (tileSize / ts) + ts / 40) + canvas.width / 25 && mousepos.y <= (cone.y * (ts / tileSize) + ts / 40) + (canvas.height / 2 - (ts * map.length) / 2))
            {
                props.cones.splice(i, 1)
            }
            i++
        })

        var i = 0
        props.tires.forEach(tire =>{
     
            if (mousepos.x >= ((tire.x) / (tileSize / ts) - ts / 40) + canvas.width / 25 && mousepos.y >= (tire.y * (ts / tileSize) - ts / 40) + (canvas.height / 2 - (ts * map.length) / 2) && mousepos.x <= ((tire.x) / (tileSize / ts) + ts / 40) + canvas.width / 25 && mousepos.y <= (tire.y * (ts / tileSize) + ts / 40) + (canvas.height / 2 - (ts * map.length) / 2))
            {
                props.tires.splice(i, 1)
            }
            i++
        })
    }
    if (activeEditMode == 1 && mousedown && mousepos.x >= 0 && mousepos.y >= 0 && (mousepos.x - canvas.width / 25) / ts <= map.length - 1 && (mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / ts <= map.length - 1)
    {
        if (activeEditProp != -1)//if not using the eraser
        {
            if (map[Math.floor((mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / ts)][Math.floor((mousepos.x - canvas.width / 25) / ts)] <= 0)
            {
                if (activeEditProp == 0)
                {
                    props.cones.push(new Prop((mousepos.x - canvas.width / 25) / (ts / tileSize), (mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / (ts / tileSize), "cone"))
                }
                if (activeEditProp == 1)
                {
                    props.tires.push(new Prop((mousepos.x - canvas.width / 25) / (ts / tileSize), (mousepos.y - (canvas.height / 2 - (ts * map.length) / 2)) / (ts / tileSize), "tire"))
                }
                mousedown = false
            }
        }
        
    }
    
}

player = new Player()

props = {
    cones: [new Prop(player.x + tileSize, player.y, "cone"), new Prop(player.x + tileSize * 2, player.y, "cone")],
    tires: [new Prop(player.x - tileSize, player.y, "tire")]
}
finishProp = new Prop(0, 0, "finish")
ghostProp = new Prop(0, 0, "ghost")

editorWallButtons = [new Button(canvas.width / 2 + canvas.width / 8, canvas.height / 10, commonOffset, commonOffset, "", "white", "grey", "", 0), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 1.5, canvas.height / 10, commonOffset, commonOffset, "", "white", "grey", "", 1), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 3, canvas.height / 10, commonOffset, commonOffset, "", "white", "grey", "", 2)]

editorSpecialButtons = [new Button(canvas.width / 2 + canvas.width / 8, canvas.height / 10 * 2 + commonOffset / 2, commonOffset, commonOffset, "CP", "yellow", "gold", ""), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 1.5,canvas.height / 10 * 2 + commonOffset / 2, commonOffset, commonOffset, "Finish", "lime", "green", ""), , new Button(canvas.width / 2 + canvas.width / 8 + 2 * commonOffset * 1.5, canvas.height / 10 * 2 + commonOffset / 2, commonOffset, commonOffset, "Eraser", "red", "crimson", "")]

editorFloorButtons = [new Button(canvas.width / 2 + canvas.width / 8, canvas.height / 10 * 3 + commonOffset / 2, commonOffset, commonOffset, "Asphalt", "darkgrey", "grey", ""), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 1.5, canvas.height / 10 * 3 + commonOffset / 2, commonOffset, commonOffset, "Mud", "saddlebrown", "rgb(92, 61, 30)", ""), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 3, canvas.height / 10 * 3 + commonOffset / 2, commonOffset, commonOffset, "Slime", "green", "forestgreen", "")]

editorSkyButtons = [new Button(canvas.width / 2 + canvas.width / 8, canvas.height / 10 * 4 + commonOffset / 2, commonOffset, commonOffset, "Day", "lightblue", "skyblue", ""), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 1.5, canvas.height / 10 * 4 + commonOffset / 2, commonOffset, commonOffset, "Night", "darkblue", "navy", ""), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 3, canvas.height / 10 * 4 + commonOffset / 2, commonOffset, commonOffset, "Stormy", "gray", "dimgray", "")]

editorPropButtons = [new Button(canvas.width / 2 + canvas.width / 8, canvas.height / 10 * 5 + commonOffset / 2, commonOffset, commonOffset, "Cone", "orange", "darkorange", ""), new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 1.5, canvas.height / 10 * 5 + commonOffset / 2, commonOffset, commonOffset, "Tire", "grey", "darkgray", "")]

mapSizeButton = new Button(canvas.width / 2 + canvas.width / 8, canvas.height - canvas.height / 10 - commonOffset, commonOffset * 2, commonOffset, "Change Map Size", 'white', "grey", "black", 0)

changeLapCount = new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 3, canvas.height - canvas.height / 10 - commonOffset, commonOffset * 2, commonOffset, "Change Lap Count", 'white', "grey", "black", 0)

backToMenuFromEditor = new Button(canvas.width / 2 + canvas.width / 8 - commonOffset * 3, canvas.height - canvas.height / 10 - commonOffset, commonOffset * 2, commonOffset, "Back", 'white', "grey", "black", 0)

exportLevelButton = new Button(canvas.width / 2 + canvas.width / 8 - commonOffset * 3, canvas.height - canvas.height / 5 - commonOffset, commonOffset * 2, commonOffset, "Export", 'white', "grey", "black", 0)

toggleStartDir = new Button(canvas.width / 2 + canvas.width / 8, canvas.height - canvas.height / 5 - commonOffset, commonOffset * 2, commonOffset, "Change Start Dir", 'lime', "green", "black", 0)

playLevel = new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 6, canvas.height - canvas.height / 10 - commonOffset, commonOffset * 2, commonOffset, "Play Level", 'white', "grey", "black", 0)

saveLevelButton = new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 6, canvas.height - canvas.height / 5 - commonOffset, commonOffset * 2, commonOffset, "Save Level", 'white', "grey", "black", 0)

loadLevelButton = new Button(canvas.width / 2 + canvas.width / 8 + commonOffset * 3, canvas.height - canvas.height / 5 - commonOffset, commonOffset * 2, commonOffset, "Load Level", 'white', "grey", "black", 0)

mainMenuButtons = [new Button(canvas.width / 40, canvas.height - canvas.width / 40 - canvas.height / 8, canvas.width / 3, canvas.height / 8, "Editor", "blue", 'darkblue', 'white'), new Button(canvas.width / 40, canvas.height - canvas.width / 40 - canvas.height / 8 - canvas.height / 8 - canvas.width / 40, canvas.width / 3, canvas.height / 8, "Your Levels", "blue", 'darkblue', 'white'), , new Button(canvas.width / 40, canvas.height - canvas.width / 40 - canvas.height / 8 - canvas.height / 8 - canvas.height / 8 - canvas.width / 40 - canvas.width / 40, canvas.width / 3, canvas.height / 8, "Imported Levels", "blue", 'darkblue', 'white')]

endRaceButtons = [new Button(canvas.width / 40, canvas.height - canvas.width / 40 - canvas.height / 8, canvas.width / 3, canvas.height / 8, "Exit", "blue", 'darkblue', 'yellow'), new Button(canvas.width - canvas.width / 40 - canvas.width / 3, canvas.height - canvas.width / 40 - canvas.height / 8, canvas.width / 3, canvas.height / 8, "Watch Ghost", "blue", 'darkblue', 'yellow'), new Button(canvas.width - canvas.width / 40 - canvas.width / 3, canvas.height - canvas.width / 40 - canvas.height / 8 - canvas.height / 8 - 10, canvas.width / 3, canvas.height / 8, "Race Ghost", "blue", 'darkblue', 'yellow')]


userLevelButtons = []
userLevelActionButton = new Button(canvas.width / 2 - canvas.width / 6, canvas.height - canvas.width / 40 - canvas.height / 8, canvas.width / 3, canvas.height / 8, "  Edit  ", "blue", 'darkblue', 'yellow')
importedLevelButtons = []
importedLevelActionButton = new Button(canvas.width / 2 - canvas.width / 6, canvas.height - canvas.width / 40 - canvas.height / 8, canvas.width / 3, canvas.height / 8, "Import Level", "blue", 'darkblue', 'yellow')

backToMenuFromUserLevels = new Button(canvas.width / 40, canvas.height - canvas.width / 40 - canvas.height / 8, canvas.width / 5, canvas.height / 8, "Back", "blue", 'darkblue', 'yellow')

var ct = Date.now()
var dt
var pt = ct

function drawFPS()
{
    c.fillStyle = 'red'
    c.font = "30px Arcade Normal"
    let width = c.measureText("FPS: " + Math.floor(1 / dt).toString()).width
    c.fillText("FPS: " + Math.floor(1 / dt).toString(), canvas.width - width - canvas.width / 64, canvas.width / 32)
}
function drawSpeed()
{
    c.fillStyle = 'black'
    c.fillRect(canvas.width / 100, canvas.height - canvas.height / 100 - 100, 100, 100)
    c.fillStyle = 'yellow'
    c.font = "30px Arcade Normal"
    let width = c.measureText(Math.floor(player.speed * 10).toString()).width / 1
    c.fillText(Math.floor(player.speed * 10).toString(), canvas.width / 100 + 100 / 2 - width / 2,  canvas.height - canvas.height / 100 - 100 + 60)
}
function drawBoost()
{
    c.fillStyle = 'black'
    c.fillRect(canvas.width - canvas.width / 3, canvas.height - canvas.height / 10 - canvas.height / 10 - 10, canvas.width / 3.1, canvas.height / 12)
    c.fillStyle = 'orange'
    c.fillRect(canvas.width - canvas.width / 3 + 5, canvas.height - canvas.height / 10 - canvas.height / 10 - 10 + 5, (boost * (canvas.width / 3.1 - 5)) / maxBoost, canvas.height / 12 - 10)
    
}

function drawArrow(x, y, length, dir, color, width)
{
    c.lineWidth = width
    c.strokeStyle = color
    c.beginPath()
    c.moveTo(x - (.5 * length * -Math.sin(dir)), y - (.5 * length * Math.cos(dir)))
    c.lineTo(x + (.5 * length * -Math.sin(dir)), y + (.5 * length * Math.cos(dir)))
    c.stroke()

    c.beginPath()
    c.moveTo(x + (.5 * length * -Math.sin(dir)), y + (.5 * length * Math.cos(dir)))
    c.lineTo(x - (Math.cos(dir) * length / 2), y - Math.sin(dir) * length / 2)
    c.stroke()

    c.beginPath()
    c.moveTo(x + (.5 * length * -Math.sin(dir)), y + (.5 * length * Math.cos(dir)))
    c.lineTo(x + (Math.cos(dir) * length / 2), y + Math.sin(dir) * length / 2)
    c.stroke()
}

var lFrame = 0
var shouldDecrease = false
var wFrame = 0
function drawLap()
{
    //canvas.height / 16 use that for the max y pos
    c.fillStyle = 'black'
    c.fillRect(canvas.width / 2 - canvas.width / 8, lFrame, canvas.width / 4, canvas.height / 8)
    c.fillStyle = 'yellow'
    c.font = (canvas.width / 40).toString() + "px Arcade Normal"
    let w = c.measureText("Lap: " + lap.toString() + "/" + lapCount.toString())
    let hDif = w.actualBoundingBoxAscent - w.actualBoundingBoxDescent
    c.fillText("Lap: " + lap.toString() + "/" + lapCount.toString(), canvas.width / 2 - w.width / 2, lFrame + canvas.height / 8 - hDif / 2 - canvas.width / 100)
    if (lFrame <= canvas.height / 16 && !shouldDecrease)
    {
        lFrame += 200 * dt
    }
    if (lFrame >= canvas.height / 17 || shouldDecrease)
    {
        
        if (shouldDecrease)
        {
            lFrame -= 200 * dt
        }
        else if (wFrame >= 1)
        {
            
            shouldDecrease = true
        }
        wFrame += dt
    }
}
function raycastScreen()
{
    posList = []
    let scanlines = canvas.width / RES
    let dir = player.direction - FOV / 2
    if (dir < 0)
    {
        dir = 6.28 + dir //dir will be negative so you just have to add
    }
    for (var i = 0; i < scanlines; i++)
    {
        posList.push(raycast(player.x, player.y, dir, i, player.direction))
        
        dir += FOV / scanlines
        if (dir > 6.28)
        {
            dir = 0 + dir - 6.28
        }
        if (dir < 0)
        {
            dir = 6.28 + dir //dir will be negative so you just have to add
        }
    }
    posList.sort((a, b) => a.length - b.length) //kinda confusing but since I already did 4000 / length I sort smallest to largest

    rayIdx = 1

    posList.forEach(ray =>{
        let trueRayLength1 = ray.trueLength
        let trueRayLength2 = posList[rayIdx].trueLength
        c.drawImage(spriteSheet, ray.offset + ((ray.type - 1) * 64), 0, 1, 64, ray.idx * RES, canvas.height / 2 - ray.length, RES, 2 * ray.length)
        
        for (var coneIdx = 0; coneIdx < props.cones.length; coneIdx++)
        {
            if (props.cones[coneIdx].distanceToPlayer >= trueRayLength2 && props.cones[coneIdx].distanceToPlayer <= trueRayLength1)
            {
                props.cones[coneIdx].draw(coneIdx)
            }
        }
    
        for (var tireIdx = 0; tireIdx < props.tires.length; tireIdx++)
        {
            if (props.tires[tireIdx].distanceToPlayer >= trueRayLength2 && props.tires[tireIdx].distanceToPlayer <= trueRayLength1)
            {
                props.tires[tireIdx].draw(tireIdx)
                tireIdx++
            }
        }
        if (finishProp.distanceToPlayer >= trueRayLength2 && finishProp.distanceToPlayer <= trueRayLength1)
        {
            finishProp.draw()
        }
        if (ghostProp.distanceToPlayer >= trueRayLength2 && ghostProp.distanceToPlayer <= trueRayLength1)
        {
            ghostProp.draw()
        }
        

        if (rayIdx < posList.length - 1)
        {
            rayIdx++
        }
        
    })

    var i = 0
    props.cones.forEach(cone =>{
        if (cone.distanceToPlayer + .0001 <= 4000 / posList[posList.length - 1].length) //if the cone is in front of the closest wall (this check is skipped over in the loop above), draw the cone
        {
            cone.draw(i)
        }
        i++
    })
    var i = 0
    props.tires.forEach(tire =>{
        if (tire.distanceToPlayer + .0001 <= 4000 / posList[posList.length - 1].length) //if the tire is in front of the closest wall (this check is skipped over in the loop above), draw the cone
        {
            tire.draw(i)
        }
        i++
    })

    if (finishProp.distanceToPlayer + .0001 <= 4000 / posList[posList.length - 1].length)
    {
        finishProp.draw()
    }
    if (ghostProp.distanceToPlayer + .0001 <= 4000 / posList[posList.length - 1].length)
    {
        ghostProp.draw()
    }

}

function drawCountdown()
{
    //canvas.height / 16 use that for the max y pos
    c.fillStyle = 'black'
    c.fillRect(canvas.width / 2 - canvas.width / 8, 0, canvas.width / 4, canvas.height / 8)
    c.fillStyle = 'yellow'
    c.font = (canvas.width / 40).toString() + "px Arcade Normal"
    let w = c.measureText(Math.ceil(Math.abs(currentTimer)))
    let hDif = w.actualBoundingBoxAscent - w.actualBoundingBoxDescent
    c.fillText(Math.ceil(Math.abs(currentTimer)), canvas.width / 2 - w.width / 2, canvas.height / 8 - hDif / 2 - canvas.width / 100)
}

function beginRace()
{
    currentTimer = -3
    //reset lap variables
    lFrame = 0
    shouldDecrease = false
    wFrame = 0
    lap = 1
    checkpoints = 0
    ghostReadIndex = 0
    boost = 0

    let cps = 0
    let fin = 0

    //reset player variables
    for (var i = 0; i < map.length; i++)
    {
        for (var j = 0; j < map.length; j++)
        {
            if (map[i][j] == -1) //if tile is finish line
            {
                player.x = j * tileSize + tileSize / 2
                player.y = i * tileSize + tileSize / 2
                finishProp = new Prop(j * tileSize + tileSize / 2, i * tileSize + tileSize / 2, "finish")
                fin++
            }
            if (map[i][j] == -2) //if tile is checkpoint
            {
                cps++
            }
        }
    }

    if (cps != 2 || fin != 1)
    {
        alert("A level must have 2 checkpoints and a finish line")
        return
    }
    props.cones.forEach(cone =>{
        cone.active = true
    })
    props.tires.forEach(tire =>{
        tire.active = true
    })

    player.speed = 0
    player.direction = startDir

    
    startRaceTime = Date.now()
    menu = 0
}

function saveLevel()
{
    output = ""
    output += (map.length.toString()) + "|" //add map size
    output += (floor.toString()) + "|"
    output += (sky.toString()) + "|"
    output += (lapCount.toString()) + "|"
    output += (startDir.toString()) + "|"
    output += map.toString() + "," //*add the comma to stop the load script from getting stuck looking for the last comma
    if (props.cones != [])
    {
        output += "c"
        props.cones.forEach(cone =>{
            output += cone.x.toString() + "," + cone.y.toString() + "|"
        })
        output += "c"
    }
    if (props.tires != [])
    {
        output += "t"
        props.tires.forEach(tire =>{
            output += tire.x.toString() + "," + tire.y.toString() + "|"
        })
        output += "t"
    }

    return output
}

function loadLevel(levelName, inLocalStorage)
{
    if (inLocalStorage)
    {
        var code = localStorage.getItem(levelName)
    }
    
    if (code == null)
    {
        alert("No Map has been saved into memory, please save a map before trying to load one")
        return
    }
    let i = 0
    let mapLength = ""
    let floorType = ""
    let skyType = ""
    let lapNum = ""
    let startingDir = ""
    let newMap = []
    while(code[i] != "|")
    {
        mapLength += code[i]
        i++
    }
    i++
    while(code[i] != "|")
    {
        floorType += code[i]
        i++
    }
    i++
    while(code[i] != "|")
    {
        skyType += code[i]
        i++
    }

    i++
    while(code[i] != "|")
    {
        lapNum += code[i]
        i++
    }

    i++
    while(code[i] != "|")
    {
        startingDir += code[i]
        i++
    }

    i++
    let previ = i
    for (var j = 0; j < mapLength; j++)
    {
        newMap.push([])
        for (var k = 0; k < mapLength; k++)
        {
            let newNum = ""
            while (code[i] != ",") // *noted above, comma is added for this loop
            {
                i++
            }
            for (var l = 0; l < i - previ; l++) //loop for the length of the number
            {
                newNum += code[l + previ]
            }
            newMap[j].push(parseInt(newNum))
            
            i++
            previ = i
        }
    }

    props.cones = []
    props.tires = []
    if (i < code.length)//if there arent any props
    {
        if (code[i] == "c")
        {
            i++
            
            while (code[i] != "c")
            {
                let x = ""
                while (code[i] != ',')
                {
                    x += code[i]
                    i++
                }
                i++
    
                let y = ""
                while (code[i] != "|")
                {
                    y += code[i]
                    i++
                }
                i++
                props.cones.push(new Prop(parseFloat(x), parseFloat(y), "cone"))
            }
        }
        if (props.cones != []) //if there were any cones
        {
            i++
        }
        
        if (code[i] == "t")
        {
            i++
            while (code[i] != "t")
            {
                let x = ""
                while (code[i] != ',')
                {
                    x += code[i]
                    i++
                }
                i++
    
                let y = ""
                while (code[i] != "|")
                {
                    y += code[i]
                    i++
                }
                i++
                props.tires.push(new Prop(parseFloat(x), parseFloat(y), "tire"))
            }
        }
    }
    
    

    map = newMap
    floor = parseInt(floorType)
    sky = parseInt(skyType)
    lapCount = parseInt(lapNum)
    startDir = parseFloat(startingDir)
    tileSize = (canvas.width * .25) / map.length
    ts = (canvas.width / 2.5) / map.length // editor tile size
}


function writeGhost()
{
    ghostWritingString += currentTimer.toString() + "|"
    ghostWritingString += player.direction.toString() + "|"
    ghostWritingString += player.x.toString() + "|"
    ghostWritingString += player.y.toString() + "|"
}
function readGhost(ghostString, viewingGhost)
{
    if (ghostReadIndex == ghostString.length && viewingGhost == true)//stops odd glitch where the ghost stops on the finish line but the finish line doesn't register
    {
        player.x += -Math.sin(player.direction)
        player.y += Math.cos(player.direction)
        return
    }
    else if (ghostReadIndex == ghostString.length && viewingGhost == false)//stops the game from freezing when the ghost finishes the race
    {
        return
    }
    else
    {
        ghostData = ghostString

        let j = ghostReadIndex
    
    
        let frameTime = ""
        while (ghostData[j] != "|")
        {
            frameTime += ghostData[j]
            j++
        }
        j++
        frameTime = parseFloat(frameTime)
    
        let direction = ""
        while (ghostData[j] != "|")
        {
            direction += ghostData[j]
            j++
        }
        j++
    
        let x = ""
        while (ghostData[j] != "|")
        {
            x += ghostData[j]
            j++
        }
        j++
    
        let y = ""
        while (ghostData[j] != "|")
        {
            y += ghostData[j]
            j++
        }
        j++
    
        if (currentTimer > frameTime)
        {
            ghostReadIndex = j
            readGhost(ghostData, viewingGhost)
        }
        else
        {
            if (viewingGhost == true)
            {
                player.x = parseFloat(x)
                player.y = parseFloat(y)
                player.direction = parseFloat(direction)
            }
            else if (viewingGhost == false)
            {
                ghostProp.x = parseFloat(x)
                ghostProp.y = parseFloat(y)
            }
        }
    }
    
}

function findGhostTime(ghostDataString)
{
    i = ghostDataString.length - 2
    for (var j = 0; j < 4; j++)
    {
        while (ghostDataString[i] != "|")
        {
            i--
        }
        i--
    }
    i++
    i++
    let c = ""
    let newString = ""
    while (ghostDataString[i] != "|")
    {
        c = ghostDataString[i]
        newString += c
        i++
    }
    return newString
}

function regulateGhostString(ghostString, pFT, iteration)//any gaps of time that are greater than .016 seconds (less than 60fps) are filled in with approximate values to make a cleaner replay
{
    ghostData = ghostString
    
    let i = 0
    let px = 0
    let py = 0
    let pi = 0
    let pd = 0
    let newGhostData = ""

    let runAgain = false

    while (i < ghostData.length - 1)
    {
        let frameTime = ""
        while (ghostData[i] != "|")
        {
            frameTime += ghostData[i]
            i++
        }
        i++
        frameTime = parseFloat(frameTime)
    
        let direction = ""
        while (ghostData[i] != "|")
        {
            direction += ghostData[i]
            i++
        }
        i++
    
        let x = ""
        while (ghostData[i] != "|")
        {
            x += ghostData[i]
            i++
        }
        i++
    
        let y = ""
        while (ghostData[i] != "|")
        {
            y += ghostData[i]
            i++
        }
        i++
    
        if (frameTime - pFT > .016 && frameTime > .5)
        {
            
            let temp = ghostData

            sGhostString = ghostData.slice(0, pi)
            eGhostString = ghostData.slice(pi, ghostData.length)
            ghostData = temp

            let newX = (parseFloat(px) + parseFloat(x)) / 2
            let newY = (parseFloat(py) + parseFloat(y)) / 2
            let newFT = (frameTime + pFT) / 2
            let newD = (parseFloat(pd) + parseFloat(direction)) / 2
            let newString = newFT.toString() + "|" + newD.toString() + "|" + newX.toString() + "|" + newY.toString() + "|"
            newGhostData = sGhostString + newString + eGhostString
            runAgain = true

        }
        pFT = frameTime
        px = x
        py = y
        pd = direction
        pi = i
    }
    if (runAgain)
    {
        regulateGhostString(newGhostData, 0, iteration)
    }
    return ghostData

    
}

function setupUserLevelButtons()
{
    let ulb = []
    let offset = ((canvas.width - (canvas.width / 20)) / 5)
    for (var i = 0; i < 5; i++)
    {
        ulb.push(new Button(canvas.width / 40 + offset * i, canvas.height / 10, offset - 5, offset / 2, "Level " + (i+1).toString(), 'white', "grey", "black", 0))
    }
    for (var i = 5; i < 10; i++)
    {
        ulb.push(new Button(canvas.width / 40 + offset * (i - 5), canvas.height / 10 + offset / 2 + 10, offset - 5, offset / 2, "Level " + (i+1).toString(), 'white', "grey", "black", 0))
    }
    return ulb
}

function setupUserLevelButtonsForGhost(findGhostString)
{

    let ulb = []
    let offset = ((canvas.width - (canvas.width / 20)) / 5)
    for (var i = 0; i < 5; i++)
    {
        if (localStorage.getItem(findGhostString + (i+1).toString()) != null)//if the level has a ghost attached to it
        {
            ulb.push(new Button(canvas.width / 40 + offset * i, canvas.height / 10, offset - 5, offset / 2, "Ghost: " + findGhostTime(localStorage.getItem(findGhostString + (i+1).toString())).toString(), 'white', "grey", "black", 0))
        }
        else
        {
            ulb.push(new Button(canvas.width / 40 + offset * i, canvas.height / 10, offset - 5, offset / 2, "No Ghost Data", 'white', "grey", "black", 0))
        }
    }
    for (var i = 5; i < 10; i++)
    {
        if (localStorage.getItem(findGhostString + (i+1).toString()) != null)//if the level has a ghost attached to it
        {
            ulb.push(new Button(canvas.width / 40 + offset * (i - 5), canvas.height / 10 + offset / 2 + 10, offset - 5, offset / 2, "Ghost: " + findGhostTime(localStorage.getItem(findGhostString + (i+1).toString())).toString(), 'white', "grey", "black", 0))
        }
        else
        {
            ulb.push(new Button(canvas.width / 40 + offset * (i - 5), canvas.height / 10 + offset / 2 + 10, offset - 5, offset / 2, "No Ghost Data", 'white', "grey", "black", 0))

        }
    }
    return ulb
}

function drawUserLevels()
{
    var i = 1
    userLevelButtons.forEach(button =>{
        if (button.isClicked())
        {
            if (localStorage.getItem("level" + (i).toString()) != null)
            {
                levelType = 0
                if (userLevelActionButton.text == "  Edit  ")//0 is edit, 1 is race solo, 2 is race ghost, 3 is delete level
                {
                    loadLevel("level" + (i).toString(), true)
                    currentSaveIndex = i
                    menu = 1
                }
                else if (userLevelActionButton.text == "Race Solo")
                {
                    driveMode = 0
                    currentSaveIndex = i
                    racingGhost = false
                    loadLevel("level" + (i).toString(), true)
                    beginRace()
                }
                else if (userLevelActionButton.text == "Race Ghost")
                {
                    driveMode = 0
                    currentSaveIndex = i
                    racingGhost = true
                    if (localStorage.getItem("userghost" + currentSaveIndex.toString()) != null)
                    {
                        ghostRacingString = localStorage.getItem("userghost" + currentSaveIndex.toString())
                        loadLevel("level" + (i).toString(), true)
                        beginRace()
                    }
                    else
                    {
                        alert("There is no ghost saved to this level")
                    }
                }
                else if (userLevelActionButton.text == "View Ghost")
                {
                    driveMode = 1
                    currentSaveIndex = i
                    racingGhost = false
                    if (localStorage.getItem("userghost" + currentSaveIndex.toString()) != null)
                    {
                        ghostWritingString = localStorage.getItem("userghost" + currentSaveIndex.toString())
                        loadLevel("level" + (i).toString(), true)
                        beginRace()
                    }
                    else
                    {
                        alert("There is no ghost saved to this level")
                    }
                }
                else if (userLevelActionButton.text == "Delete Ghost")
                {
                    currentSaveIndex = i
                    let shouldDelete = prompt("Are you sure you would like to delete this ghost (y/n)")
                    if (shouldDelete == "y")
                    {
                        localStorage.removeItem("userghost" + (i).toString())
                        alert("Ghost succesfully deleted")
                    }
                    
                }
                else if (userLevelActionButton.text == "Delete Level")
                {
                    let shouldDelete = prompt("Are you sure you would like to delete this level (y/n)")
                    if (shouldDelete == "y")
                    {
                        localStorage.removeItem("level" + (i).toString())
                        localStorage.removeItem("userghost" + (i).toString())
                    }
                    
                }
            }
            else
            {
                if (userLevelActionButton.text == "  Edit  ")
                {
                    levelType = 0
                    changeMapSize(10)
                    menu = 1
                    currentSaveIndex = i
                }
                else
                {
                    alert("Level Slot " + i.toString() +" is empty, please select another level")
                }
            }
        }
        button.draw()
        i++
    })
}

function drawImportedLevels()
{
    var i = 1
    importedLevelButtons.forEach(button =>{
        if (button.isClicked())
        {
            if (localStorage.getItem("importedlevel" + (i).toString()) != null)
            {
                levelType = 1
                if (importedLevelActionButton.text == "Import Level")
                {
                    let sd = prompt("Are you sure you want to overwrite a previously imported level? (y/n)")
                    if (sd == "y")
                    {
                        importLevel(i)
                    }
                    
                }
                else if (importedLevelActionButton.text == "Race Solo")
                {
                    driveMode = 0
                    currentSaveIndex = i
                    racingGhost = false
                    loadLevel("importedlevel" + (i).toString(), true)
                    beginRace()
                }
                else if (importedLevelActionButton.text == "Race Ghost")
                {
                    driveMode = 0
                    currentSaveIndex = i
                    racingGhost = true
                    if (localStorage.getItem("importedghost" + currentSaveIndex.toString()) != null)
                    {
                        ghostRacingString = localStorage.getItem("importedghost" + currentSaveIndex.toString())
                        loadLevel("importedlevel" + (i).toString(), true)
                        beginRace()
                    }
                    else
                    {
                        alert("There is no ghost saved to this level")
                    }
                }
                else if (importedLevelActionButton.text == "View Ghost")
                {
                    driveMode = 1
                    currentSaveIndex = i
                    racingGhost = false
                    if (localStorage.getItem("importedghost" + currentSaveIndex.toString()) != null)
                    {
                        ghostWritingString = localStorage.getItem("importedghost" + currentSaveIndex.toString())
                        loadLevel("importedlevel" + (i).toString(), true)
                        beginRace()
                    }
                    else
                    {
                        alert("There is no ghost saved to this level")
                    }
                }
                
            }
            else
            {
                if (importedLevelActionButton.text == "Import Level")
                {
                    levelType = 1
                    importLevel(i)
                }
                else
                {
                    alert("Imported Level Slot " + i.toString() +" is empty, please select another level")
                }
                
            }
        }
        button.draw()
        i++
    })
}

function artificiallag()
{
    for (var z = 0; z < 1000; z++)
    {
        console.log(z)
    }
}

function saveInLowestSlot()
{
    let announceSave = true
    if (localStorage.getItem("level1") == null)
    {
        localStorage.setItem("level1", saveLevel())
        currentSaveIndex = 1
    }
    else if (localStorage.getItem("level2") == null)
    {
        localStorage.setItem("level2", saveLevel())
        currentSaveIndex = 2
    }
    else if (localStorage.getItem("level3") == null)
    {
        localStorage.setItem("level3", saveLevel())
        currentSaveIndex = 3
    }
    else if (localStorage.getItem("level4") == null)
    {
        localStorage.setItem("level4", saveLevel())
        currentSaveIndex = 4
    }
    else if (localStorage.getItem("level5") == null)
    {
        localStorage.setItem("level5", saveLevel())
        currentSaveIndex = 5
    }
    else if (localStorage.getItem("level6") == null)
    {
        localStorage.setItem("level6", saveLevel())
        currentSaveIndex = 6
    }
    else if (localStorage.getItem("level7") == null)
    {
        localStorage.setItem("level7", saveLevel())
        currentSaveIndex = 7
    }
    else if (localStorage.getItem("level8") == null)
    {
        localStorage.setItem("level8", saveLevel())
        currentSaveIndex = 8
    }
    else if (localStorage.getItem("level9") == null)
    {
        localStorage.setItem("level9", saveLevel())
        currentSaveIndex = 9
    }
    else if (localStorage.getItem("level10") == null)
    {
        localStorage.setItem("level10", saveLevel())
        currentSaveIndex = 10
    }
    else //if all the levels are full, prompt to delete a level
    {
        deleteLevel = prompt("All level slots are full, this level will overwrite the level in the 10th slot, would you like to continue (y/n)")
        currentSaveIndex = 0
        if (deleteLevel == "y")
        {
            localStorage.setItem("level10", saveLevel())
            currentSaveIndex = 10
        }
        else
        {
            announceSave = false
        }
    }
    if (announceSave == true)
    {
        alert("Succesfully Saved Level " + currentSaveIndex.toString())
    }
}

function exportLevel()
{
    if (localStorage.getItem("level" + currentSaveIndex.toString()) != null && localStorage.getItem("userghost" + currentSaveIndex.toString()) != null)
    {
        let exportString = ""
        exportString += localStorage.getItem("level" + currentSaveIndex.toString())
        exportString += "{"
        exportString += localStorage.getItem("userghost" + currentSaveIndex.toString())
        navigator.clipboard.writeText(exportString)
        alert("Level Succesfully Copied to Clipboard")
    }
    else
    {
        alert("A ghost is required to export a level")
    }
    
}
function importLevel(indexToReturn)
{
    let levelCode = prompt("Enter a level code: ")
    let i = 0
    while (levelCode[i] != "{")
    {
        i++
    }
    localStorage.setItem("importedlevel" + indexToReturn.toString(), levelCode.substring(0, i))
    localStorage.setItem("importedghost" + indexToReturn.toString(), levelCode.substring(i + 1, levelCode.length))
}

changeMapSize(10)

function animate()
{
    ct = Date.now()
    dt = (ct - pt) / 1000
    c.clearRect(0, 0, canvas.width, canvas.height)
    
    requestAnimationFrame(animate)

    if (menu == 0)
    {
        c.fillRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = skyTypes[sky]
        c.fillRect(0, 0, canvas.width, canvas.height / 2)
        c.fillStyle = floorTypes[floor].color
        c.fillRect(0, canvas.height / 2, canvas.width, canvas.height)
        
    
        if (currentTimer >= 0)
        {
            if (driveMode == 0)
            {
                player.update()
                writeGhost()
                if (racingGhost == true)
                {
                    readGhost(ghostRacingString, false)
                }
            }
            else
            {
                readGhost(ghostWritingString, true)
                player.doCheckpoints()
            }
        }
        
        
        props.cones.forEach(cone =>{
            cone.update()
        })
        props.tires.forEach(tire =>{
            tire.update()
        })
        finishProp.update()
        ghostProp.update()

        raycastScreen()

        drawMap()
        player.draw()
    
        if (currentTimer < 0)
        {
            drawCountdown()
        }
        else
        {
            drawLap()
        }
        
        drawFPS()

        if (driveMode == 0)
        {
            drawSpeed()
            drawBoost()
        }
        
        
        if (lap > lapCount)
        {
            menu = 3
            endTime = (Date.now() - startRaceTime) / 1000 - 3
            endTime = (endTime + .0).toFixed(2) //finds the time since the start of the race, rounded to 2 decimal places
        }


        currentTimer = (Date.now() - startRaceTime) / 1000 - 3
        currentTimer = (currentTimer + .0).toFixed(2) //finds the time since the start of the race, rounded to 2 decimal places
        if (currentTimer >= 0)
        {
            c.fillStyle = 'black'
            c.fillRect(canvas.width - canvas.width / 3, canvas.height - canvas.height / 10, canvas.width / 3.1, canvas.height / 12)
            c.fillStyle = 'yellow'
            c.font = 40 + "px Arcade Normal"
            let w = c.measureText(currentTimer.toString())
            let h = w.actualBoundingBoxAscent - w.actualBoundingBoxDescent
            c.fillText(currentTimer.toString(), (canvas.width - canvas.width / 3) + canvas.width / 6.05 - w.width / 2, (canvas.height - canvas.height / 10) + canvas.height / 24 + 15)    
        }
        }
    else if (menu == 1)
    {
        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = skyTypes[sky]
        c.fillRect(0, 0, canvas.width, canvas.height)
        drawEditorMap()
        checkpoints = 0
        editorWallButtons.forEach(button =>{
            button.draw()
            if (button.isClicked())
            {
                activeEditMode = 0
                activeEditTile = (button.img / 64) + 1
            }
        })
        i = 0
        editorFloorButtons.forEach(button =>{
            button.draw()
            if (button.isClicked())
            {
                floor = i
                
            }
            i++
        })
        i = 0
        editorSkyButtons.forEach(button =>{
            button.draw()
            if (button.isClicked())
            {
                sky = i
                
            }
            i++
        })
        editorPropButtons.forEach(button =>{
            button.draw()
            if (button.isClicked())
            {
                activeEditMode = 1
                if (button.text == "Cone")
                {
                    activeEditProp = 0
                }
                if (button.text == "Tire")
                {
                    activeEditProp = 1
                }
                
            }
            i++
        })
        editorSpecialButtons.forEach(button =>{
            button.draw()
            if (button.isClicked())
            {
                if (button.text == 'CP')
                {
                    activeEditTile = -2
                }
                else if (button.text == 'Finish')
                {
                    activeEditTile = -1
                }
                else if (button.text == "Eraser")
                {
                    activeEditTile = 0
                    activeEditProp = -1
                }
                
            }
        })
        mapSizeButton.draw()
        if (mapSizeButton.isClicked())
        {
            changeMapSize(parseInt(prompt("Enter New Map Size: ")))
        }
        changeLapCount.draw()
        if (changeLapCount.isClicked())
        {
            lapCount = parseInt(prompt("Enter New Number of Laps (1-10): "))
            if (lapCount < 1)
            {
                lapCount = 1
            }
            if (lapCount > 10)
            {
                lapCount = 10
            }
        }
        backToMenuFromEditor.draw()
        if (backToMenuFromEditor.isClicked())
        {
            menu = 2
        }
        exportLevelButton.draw()
        if (exportLevelButton.isClicked())
        {
            exportLevel()
        }
        toggleStartDir.draw()
        if (toggleStartDir.isClicked())
        {
            startDir += Math.PI / 4
            if (startDir > Math.PI * 2)
            {
                startDir = 0
            }
            mousedown = false
        }
        playLevel.draw()
        if (playLevel.isClicked())
        {
            driveMode = 0
            beginRace()
        }
        saveLevelButton.draw()
        if (saveLevelButton.isClicked())
        {
            if (currentSaveIndex == 0)
            {
                saveInLowestSlot()
            }
            else
            {
                localStorage.setItem("level" + currentSaveIndex.toString(), saveLevel())
                localStorage.removeItem("userghost" + currentSaveIndex.toString())
                alert("Succesfully Saved Level " + currentSaveIndex.toString())
            }
        }
        
        loadLevelButton.draw()
        if (loadLevelButton.isClicked())
        {
            menu = 4
        }

        editMap()
        editMapProps()
    }
    else if (menu == 2)
    {
        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = "dodgerblue"
        c.fillRect(0, 0, canvas.width, canvas.height)

        mainMenuButtons.forEach(button =>{
            if (button.isClicked())
            {
                if (button.text == "Editor")
                {
                    menu = 1
                }
                if (button.text == "Your Levels")
                {
                    menu = 4
                }
                if (button.text == "Imported Levels")
                {
                    menu = 5
                }
            }
            button.draw()
        })

    }
    else if (menu == 3)
    {
        //draws the replay lag screen
        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = 'dodgerblue'
        c.fillRect(0, 0, canvas.width, canvas.height)
        c.font = 60 + "px Arcade Normal"

        let width = c.measureText("Removing Lag From Replay").width
        c.fillStyle = 'white'
        c.fillText("Removing Lag From Replay", canvas.width / 2 - width / 2, canvas.height / 4)
        ghostWritingString = regulateGhostString(ghostWritingString, 0, 0)



        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = "dodgerblue"
        c.fillRect(0, 0, canvas.width, canvas.height)

        let w = 0
        if (levelType == 0)//if playing a user created level
        {
            if (localStorage.getItem('userghost' + currentSaveIndex) == null)
            {
                localStorage.setItem('userghost' + (currentSaveIndex).toString(), ghostWritingString)
            }
            else if (endTime < parseFloat(findGhostTime(localStorage.getItem('userghost' + currentSaveIndex))))
            {
                localStorage.setItem('userghost' + (currentSaveIndex).toString(), ghostWritingString)
            }
    
            if (driveMode == 1 && racingGhost == false)//if wathcing ghost don't show ghost time
            {
                endTime = findGhostTime(localStorage.getItem('userghost' + currentSaveIndex))
            }
            else
            {
                c.font = 40 + "px Arcade Normal"
                w = c.measureText("Ghost Time: " + findGhostTime(localStorage.getItem('userghost' + currentSaveIndex)).toString()).width
                c.fillStyle = 'yellow'
                c.fillText("Ghost Time: " + findGhostTime(localStorage.getItem('userghost' + currentSaveIndex)).toString(), canvas.width / 2 - w / 2, canvas.height / 2.25)
            }
        }
        else if (levelType == 1)
        {
    
            if (driveMode == 1 && racingGhost == false)//if wathcing ghost don't show ghost time
            {
                endTime = findGhostTime(localStorage.getItem('importedghost' + currentSaveIndex))
            }
            else
            {
                c.font = 40 + "px Arcade Normal"
                w = c.measureText("Ghost Time: " + findGhostTime(localStorage.getItem('importedghost' + currentSaveIndex)).toString()).width
                c.fillStyle = 'yellow'
                c.fillText("Ghost Time: " + findGhostTime(localStorage.getItem('importedghost' + currentSaveIndex)).toString(), canvas.width / 2 - w / 2, canvas.height / 2.25)
            }
        }
        
        c.font = 60 + "px Arcade Normal"
        w = c.measureText(endTime.toString()).width
        c.fillStyle = 'yellow'
        c.fillText(endTime.toString(), canvas.width / 2 - w / 2, canvas.height / 4)
        endRaceButtons.forEach(button =>{
            if (button.isClicked())
            {
                if (button.text == 'Exit')
                {
                    menu = 2
                    ghostWritingString = ""
                }
                else if (button.text == "Watch Ghost")
                {
                    driveMode = 1
                    if (levelType == 0)
                    {
                        ghostWritingString = localStorage.getItem("userghost" + currentSaveIndex.toString())
                    }
                    if (levelType == 1)
                    {
                        ghostWritingString = localStorage.getItem("importedghost" + currentSaveIndex.toString())
                    }
                    
                    ghostReadIndex = 0
                    racingGhost = false
                    beginRace()
                }
                else if (button.text == "Race Ghost")
                {
                    driveMode = 0
                    racingGhost = true
                    if (levelType == 0)
                    {
                        ghostWritingString = localStorage.getItem("userghost" + currentSaveIndex.toString())
                    }
                    if (levelType == 1)
                    {
                        ghostWritingString = localStorage.getItem("importedghost" + currentSaveIndex.toString())
                    }
                    ghostRacingString = ghostWritingString
                    ghostReadIndex = 0
                    beginRace()
                }
            }
            button.draw()
        })
    }
    else if (menu == 4)
    {
        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = 'dodgerblue'
        c.fillRect(0, 0, canvas.width, canvas.height)
        if (userLevelActionButton.text == "Race Ghost" || userLevelActionButton.text == "View Ghost")
        {
            userLevelButtons = setupUserLevelButtonsForGhost("userghost")
        }
        else
        {
            userLevelButtons = setupUserLevelButtons()
        }
        
        userLevelActionButton.draw()
        if (userLevelActionButton.isClicked())
        {
            if (userLevelActionButton.text == "  Edit  ")
            {
                userLevelActionButton.changeText("Race Solo")
            }
            else if (userLevelActionButton.text == "Race Solo")
            {
                userLevelActionButton.changeText("Race Ghost")
            }
            else if (userLevelActionButton.text == "Race Ghost")
            {
                userLevelActionButton.changeText("View Ghost")
            }
            else if (userLevelActionButton.text == "View Ghost")
            {
                userLevelActionButton.changeText("Delete Ghost")
            }
            else if (userLevelActionButton.text == "Delete Ghost")
            {
                userLevelActionButton.changeText("Delete Level")
            }
            else if (userLevelActionButton.text == "Delete Level")
            {
                userLevelActionButton.changeText("  Edit  ")
            }
        }
        backToMenuFromUserLevels.draw()
        if (backToMenuFromUserLevels.isClicked())
        {
            menu = 2
        }

        drawUserLevels()
    }
    else if (menu == 5)
    {
        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = 'dodgerblue'
        c.fillRect(0, 0, canvas.width, canvas.height)
        if (importedLevelActionButton.text == "Race Ghost" || importedLevelActionButton.text == "View Ghost")
        {
            importedLevelButtons = setupUserLevelButtonsForGhost("importedghost")
        }
        else
        {
            importedLevelButtons = setupUserLevelButtons()
        }
        importedLevelActionButton.draw()
        if (importedLevelActionButton.isClicked())
        {
            if (importedLevelActionButton.text == "Import Level")
            {
                importedLevelActionButton.changeText("Race Solo")
            }
            else if (importedLevelActionButton.text == "Race Solo")
            {
                importedLevelActionButton.changeText("Race Ghost")
            }
            else if (importedLevelActionButton.text == "Race Ghost")
            {
                importedLevelActionButton.changeText("View Ghost")
            }
            else if (importedLevelActionButton.text == "View Ghost")
            {
                importedLevelActionButton.changeText("Import Level")
            }
        }
        backToMenuFromUserLevels.draw()
        if (backToMenuFromUserLevels.isClicked())
        {
            menu = 2
        }

        drawImportedLevels()
    }
    
    pt = ct
}
animate()

document.onkeydown = function(e)
{
    if (e.key == 'w' || e.key == 'ArrowUp')
    {
        keys.w = true
    }
    if (e.key == 's' || e.key == 'ArrowDown')
    {
        keys.s = true
    }
    if (e.key == 'a' || e.key == 'ArrowLeft')
    {
        keys.a = true
        keys.d = false
    }
    if (e.key == 'd' || e.key == 'ArrowRight')
    {
        keys.d = true
        keys.a = false
    }
    if (keys.shift == false)
    {
        if (e.key == "Shift")
        {
            keys.shift = true
        }
    }
    
    if (e.key == "r") //resets the race
    {
        if (menu == 0)
        {
            beginRace()
        }
    }
    if (e.key == "p") //saves the level
    {
        saveLevel()
    }
    if (e.key == "l") //loads a level
    {
        loadLevel()
    }
    if (e.key == "f")
    {
        driveMode = 1
    }
    if (e.key == "g")
    {
        driveMode = 0
    }
    if (e.key == " ")
    {
        keys.space = true
    }
    if (e.key == "q")
    {
        menu = 2
    }
}
document.onkeyup = function(e)
{
    if (e.key == 'w' || e.key == 'ArrowUp')
    {
        keys.w = false
    }
    if (e.key == 's' || e.key == 'ArrowDown')
    {
        keys.s = false
    }
    if (e.key == 'a' || e.key == 'ArrowLeft')
    {
        keys.a = false
    }
    if (e.key == 'd' || e.key == 'ArrowRight')
    {
        keys.d = false
    }
    if (e.key == "Shift")
    {
        keys.shift = false
    }
    if (e.key == " ")
    {
        keys.space = false
    }
}

document.onmousemove = function(e)
{
    mousepos.x = e.offsetX
    mousepos.y = e.offsetY
}
document.onmousedown = function(e)
{
    mousedown = true
}
document.onmouseup = function(e)
{
    mousedown = false
}
