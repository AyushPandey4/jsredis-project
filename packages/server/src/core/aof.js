const fs = require('fs');
const { RESPParser } = require('../resp/parser');
const { serializeArray } = require('../resp/serializer');


const AOF_FILE_PATH = process.env.AOF_FILE_PATH || '/app/data/jredis.aof';

class Aof {
  constructor() {
    this.filePath = AOF_FILE_PATH;
    this.isReplaying = false;
  }

  write(commandArray) {
    if (this.isReplaying) {
      return;
    }

    const respCommand = serializeArray(commandArray);
    try {
      // Use appendFileSync for guaranteed immediate writes, which is ideal for test reliability.
      fs.appendFileSync(this.filePath, respCommand);
    } catch (err) {
      console.error('Error writing to AOF:', err);
    }
  }

  load(commandExecutor) {
    console.log(`Loading data from AOF file: ${this.filePath}`);
    this.isReplaying = true;
    try {
      const fileContent = fs.readFileSync(this.filePath);
      if (fileContent.length === 0) {
        console.log('AOF file is empty. No data to load.');
        this.isReplaying = false;
        return;
      }
      
      let commandsExecuted = 0;
      const parser = new RESPParser((commandArray) => {
        commandExecutor(commandArray);
        commandsExecuted++;
      });
      parser.feed(fileContent);
      console.log(`AOF replay finished. Executed ${commandsExecuted} commands.`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('AOF file not found. Starting with an empty dataset.');
      } else {
        console.error('Error loading AOF file:', err);
        process.exit(1);
      }
    } finally {
      this.isReplaying = false;
    }
  }
}

module.exports = new Aof();