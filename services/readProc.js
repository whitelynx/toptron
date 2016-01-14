import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import util from 'util';

import _ from 'lodash';
import Promise from 'bluebird';
import _glob from 'glob';

Promise.promisifyAll(fs);

const glob = Promise.promisify(_glob);


const defaultParseKVPOptions = {
    keyRE: /^([^:\s]+):?\s+/,
    fieldSepRE: /\s+/g,
    newlineRE: /\n/g
};

const cpuStatKeys = [
    'user',       // normal processes executing in user mode
    'nice',       // niced processes executing in user mode
    'system',     // processes executing in kernel mode
    'idle',       // twiddling thumbs
    'iowait',     // waiting for I/O to complete
    'irq',        // servicing interrupts
    'softirq',    // servicing softirqs
    'steal',      // involuntary wait
    'guest',      // running a normal guest
    'guestNice', // running a niced guest
];

const procStatKeys = [
    'pid',         // process id
    'tcomm',       // filename of the executable
    'state',       // state (see `procStateDescriptions` below)
    'ppid',        // process id of the parent process
    'pgrp',        // pgrp of the process
    'sid',         // session id
    'ttyNr',       // tty the process uses
    'ttyPgrp',     // pgrp of the tty
    'flags',       // task flags
    'minFlt',      // number of minor faults
    'cminFlt',     // number of minor faults with child's
    'majFlt',      // number of major faults
    'cmajFlt',     // number of major faults with child's
    'uTime',       // user mode jiffies
    'sTime',       // kernel mode jiffies
    'cuTime',      // user mode jiffies with child's
    'csTime',      // kernel mode jiffies with child's
    'priority',    // priority level
    'nice',        // nice level
    'numThreads',  // number of threads
    'itRealValue', // (obsolete, always 0)
    'startTime',   // time the process started after system boot
    'vsize',       // virtual memory size
    'rss',         // resident set memory size
    'rsslim',      // current limit in bytes on the rss
    'startCode',   // address above which program text can run
    'endCode',     // address below which program text can run
    'startStack',  // address of the start of the main process stack
    'esp',         // current value of ESP
    'eip',         // current value of EIP
    'pending',     // bitmap of pending signals
    'blocked',     // bitmap of blocked signals
    'sigign',      // bitmap of ignored signals
    'sigcatch',    // bitmap of caught signals
    'wchan',       // address where process went to sleep
    '_',           // (place holder)
    '_',           // (place holder)
    'exitSignal',  // signal to send to parent thread on exit
    'taskCpu',     // which CPU the task is scheduled on
    'rtPriority',  // realtime priority
    'policy',      // scheduling policy (man sched_setscheduler)
    'blkioTicks',  // time spent waiting for block IO
    'gTime',       // guest time of the task in jiffies
    'cgTime',      // guest time of the task children in jiffies
    'startData',   // address above which program data+bss is placed
    'endData',     // address below which program data+bss is placed
    'startBrk',    // address above which program heap can be expanded with brk()
    'argStart',    // address above which program command line is placed
    'argEnd',      // address below which program command line is placed
    'envStart',    // address above which program environment is placed
    'envEnd',      // address below which program environment is placed
    'exitCode',    // the thread's exit_code in the form reported by the waitpid system call
];

const procStateDescriptions = {
    R: 'running',
    S: 'sleeping',
    D: 'sleeping in an uninterruptible wait',
    Z: 'zombie',
    T: 'traced or stopped',
};

const procStatmKeys = [
    'size',     // total program size (pages)        (same as VmSize in status)
    'resident', // size of memory portions (pages)   (same as VmRSS in status)
    'shared',   // number of pages that are shared   (i.e. backed by a file)
    'trs',      // number of pages that are 'code'   (not including libs; broken, includes data segment)
    'lrs',      // number of pages of library        (always 0 on 2.6)
    'drs',      // number of pages of data/stack     (including libs; broken, includes library text)
    'dt',       // number of dirty pages             (always 0 on 2.6)
];

class ProcReader extends EventEmitter
{
    constructor(options)
    {
        super();

        options = _.assign(options || {}, {
            intervalMS: 2000
        });

        this.stats = {};
        this.statsRaw = {};
        this.prevStatsRaw = {};
        this.processes = [];
        this.processesRaw = {};
        this.prevProcessesRaw = {};

        this.updateRunning = false;

        this.update();
        setInterval(() => {
            this.update();
        }, options.intervalMS);
    } // end constructor

    update()
    {
        if(this.updateRunning)
        {
            console.warn('Update already running! Skipping update.');
            return;
        } // end if

        this.updateRunning = true;
        Promise.join(this.readStats(), this.readMeminfo(), this.readProcesses(), (statsRaw, meminfoRaw, processesRaw) => {
            this.prevStatsRaw = this.statsRaw;
            this.statsRaw = statsRaw;
            this.stats = _.mapValues(statsRaw, (curStatsVal, statsKey) => {
                var prevStatsVal = this.prevStatsRaw[statsKey];

                switch(statsKey)
                {
                    case 'btime':
                    case 'procs_running':
                    case 'procs_blocked':
                        return curStatsVal[0];

                    case 'processes':
                        return _.isUndefined(prevStatsVal) ? 0 : (curStatsVal[0] - prevStatsVal[0]);

                    default:
                        // Calculate differences from last update, for cumulative fields.
                        if(_.isUndefined(prevStatsVal))
                        {
                            if(_.isArray(curStatsVal))
                            {
                                return _.map(curStatsVal, () => 0);
                            }
                            else
                            {
                                return _.mapValues(curStatsVal, () => 0);
                            } // end if
                        }
                        else if(_.isArray(curStatsVal))
                        {
                            return _.map(curStatsVal, (cur, idx) => {
                                return cur - prevStatsVal[idx];
                            });
                        }
                        else
                        {
                            return _.mapValues(curStatsVal, (cur, key) => {
                                return cur - prevStatsVal[key];
                            });
                        } // end if
                } // end switch
            });

            _.forIn(this.stats, (curStatsVal, statsKey) => {
                if(/^cpu/.test(statsKey))
                {
                    this.calcCPUPercentages(curStatsVal);
                } // end if
            });

            this.meminfoRaw = meminfoRaw;
            var meminfo = this.stats.mem = _.transform(meminfoRaw, (accum, meminfoVal, meminfoKey) => {
                switch(meminfoKey)
                {
                    case 'NFS_Unstable': meminfoKey = 'nfsUnstable'; break;
                    default:
                        meminfoKey = meminfoKey.replace(/^Mem/, '');
                        meminfoKey = meminfoKey[0].toLowerCase() + meminfoKey.slice(1);
                } // end switch

                switch(meminfoVal.length)
                {
                    case 2:
                        var num = parseInt(meminfoVal[0], 10);
                        switch(meminfoVal[1])
                        {
                            case 'B':
                                accum[meminfoKey] = num; break;
                            case 'kB':
                                accum[meminfoKey] = num * 1024; break;
                            case 'MB':
                                accum[meminfoKey] = num * 1024 * 1024; break;
                            case 'GB':
                                accum[meminfoKey] = num * 1024 * 1024 * 1024; break;
                            case 'TB':
                                accum[meminfoKey] = num * 1024 * 1024 * 1024 * 1024; break;
                        } // end switch
                        break;

                    case 1: accum[meminfoKey] = meminfoVal[0]; break;

                    default: accum[meminfoKey] = meminfoVal; break;
                } // end switch
            }, {});

            meminfo.used = meminfo.total - meminfo.free - meminfo.buffers - meminfo.cached - meminfo.swapCached;
            meminfo.swapUsedUncached = meminfo.swapTotal - meminfo.swapFree - meminfo.swapCached;
            meminfo.swapUsedCached = meminfo.swapCached;

            meminfo.percent = {
                free: meminfo.free / meminfo.total,
                available: meminfo.Available / meminfo.total,
                buffers: meminfo.buffers / meminfo.total,
                cached: meminfo.cached / meminfo.total,
                swapCached: meminfo.swapCached / meminfo.total,
                used: meminfo.used / meminfo.total,

                swapFree: meminfo.swapFree / meminfo.swapTotal,
                swapUsedUncached: meminfo.swapUsedUncached / meminfo.swapTotal,
                swapUsedCached: meminfo.swapUsedCached / meminfo.swapTotal,
            };

            //console.log('stats:', ins(this.stats));

            this.prevProcessesRaw = this.processesRaw;
            this.processesRaw = {};

            return processesRaw;
        })
            .map((cur) => {
                this.processesRaw[cur.pid] = cur;

                // Calculate differences from last update.
                var prev = this.prevProcessesRaw[cur.pid] || {};
                var calc = {
                    pid: cur.pid,
                    command: cur.command,
                    cwd: cur.cwd,
                    cpu: {
                        uTime: cur.uTime - prev.uTime,                // user mode jiffies
                        sTime: cur.sTime - prev.sTime,                // kernel mode jiffies
                        cuTime: cur.cuTime - prev.cuTime,             // user mode jiffies with child's
                        csTime: cur.csTime - prev.csTime,             // kernel mode jiffies with child's
                        blkioTicks: cur.blkioTicks - prev.blkioTicks, // time spent waiting for block IO
                        gTime: cur.gTime - prev.gTime,                // guest time of the task in jiffies
                        cgTime: cur.cgTime - prev.cgTime,             // guest time of the task children in jiffies

                        percent: {}, // Filled below.
                    },
                    memory: {
                        size: cur.size,         // total program size (pages)
                        resident: cur.resident, // size of memory portions (pages)
                        shared: cur.shared,     // number of pages that are shared
                        trs: cur.trs,           // number of pages that are 'code'
                        lrs: cur.lrs,           // number of pages of library
                        drs: cur.drs,           // number of pages of data/stack
                        dt: cur.dt,             // number of dirty pages

                        percent: {}, //TODO: Fill!
                    }
                };

                var curCPUUsage = this.stats.cpu;
                var calcCPU = calc.cpu;
                calcCPU.percent.uTime = calcCPU.uTime / Math.min(curCPUUsage.totalTicks, 1);
                calcCPU.percent.sTime = calcCPU.sTime / Math.min(curCPUUsage.totalTicks, 1);
                calcCPU.percent.cuTime = calcCPU.cuTime / Math.min(curCPUUsage.totalTicks, 1);
                calcCPU.percent.csTime = calcCPU.csTime / Math.min(curCPUUsage.totalTicks, 1);
                calcCPU.percent.blkioTicks = calcCPU.blkioTicks / Math.min(curCPUUsage.totalTicks, 1);
                calcCPU.percent.gTime = calcCPU.gTime / Math.min(curCPUUsage.totalTicks, 1);
                calcCPU.percent.cgTime = calcCPU.cgTime / Math.min(curCPUUsage.totalTicks, 1);

                calcCPU.percent.total = _.sum([
                    calcCPU.uTime,
                    calcCPU.sTime,
                    calcCPU.blkioTicks,
                    calcCPU.gTime,
                ]) / Math.min(curCPUUsage.totalTicks, 1);

                calcCPU.percent.totalWithChildren = _.sum([
                    calcCPU.cuTime,
                    calcCPU.csTime,
                    calcCPU.blkioTicks,
                    calcCPU.cgTime,
                ]) / Math.min(curCPUUsage.totalTicks, 1);

                calcCPU.uTimePercentOfUser = calcCPU.uTime / Math.min(curCPUUsage.user + curCPUUsage.nice, 1);
                calcCPU.sTimePercentOfSystem = calcCPU.sTime / Math.min(curCPUUsage.system, 1);
                calcCPU.cuTimePercentOfUser = calcCPU.cuTime / Math.min(curCPUUsage.user + curCPUUsage.nice, 1);
                calcCPU.csTimePercentOfSystem = calcCPU.csTime / Math.min(curCPUUsage.system, 1);
                calcCPU.blkioTicksPercentOfIOWait = calcCPU.blkioTicks / Math.min(curCPUUsage.iowait, 1);
                calcCPU.gTimePercentOfGuest = calcCPU.gTime / Math.min(curCPUUsage.guest + curCPUUsage.guestNice, 1);
                calcCPU.cgTimePercentOfGuest = calcCPU.cgTime / Math.min(curCPUUsage.guest + curCPUUsage.guestNice, 1);

                return calc;
            })
            .then((processes) => {
                this.processes = processes;
                this.emit('update');
            })
            .finally(() => this.updateRunning = false);
    } // end update

    readFile(filename)
    {
        return fs.readFileAsync(filename, { encoding: 'utf8' });
    } // end readFile

    readStats()
    {
        return this.readFile('/proc/stat')
            .then((statData) => {
                var parsed = this.parseKVP(statData, { filename: '/proc/stat' });
                delete parsed.intr;
                delete parsed.softirq;
                return this.nameCPUStatKeys(parsed);
            });
    } // end readStats

    readMeminfo()
    {
        return this.readFile('/proc/meminfo')
            .then((statData) => this.parseKVP(statData, { filename: '/proc/meminfo' }));
    } // end readMeminfo

    readProcesses()
    {
        //TODO: Not sure which variant is faster/more correct...
        return glob('/proc/+([0-9])/')
        //return glob('/proc/*/')
            .map((dirname) => {
                var pid = path.basename(dirname);
                var prev = this.prevProcessesRaw[pid] || {};
                return Promise.join(
                    this.readFlatProcFile(path.join(dirname, 'stat'), procStatKeys),
                    this.readFlatProcFile(path.join(dirname, 'statm'), procStatmKeys),
                    prev.command || this.readFile(path.join(dirname, 'cmdline'))
                        .then((cmdline) => cmdline.split(/\0/g)),
                    prev.cwd || fs.readlinkAsync(path.join(dirname, 'cwd'))
                        .catch({ code: 'EACCES' }, () => null),
                    (stat, statm, command, cwd) => {
                        stat.stateDesc = procStateDescriptions[stat.state];
                        delete stat._;
                        return _.assign({ pid: parseInt(pid, 10), dirname, command, cwd }, stat, statm);
                    }
                );
            });
    } // end readProcesses

    readFlatProcFile(filename, keys)
    {
        return this.readFile(filename)
            .then((statData) => {
                var fields = statData.split(defaultParseKVPOptions.fieldSepRE);
                return _.zipObject(keys, fields);
            });
    } // end readFlatProcFile

    parseKVP(data, options)
    {
        options = _.assign(options || {}, defaultParseKVPOptions);

        var parsed = {};

        data.split(options.newlineRE)
            .forEach((line, lineIdx) => {
                if(line.length === 0)
                {
                    return;
                } // end if

                var match = options.keyRE.exec(line);
                if(!match)
                {
                    var filenameDesc = options.filename ? ' of ' + options.filename : '';
                    console.warn(`Couldn't match key regex ${options.keyRE} on line ${lineIdx + 1}${filenameDesc}!`);
                    return;
                } // end if

                var fields = line.slice(match[0].length).split(options.fieldSepRE);
                parsed[match[1]] = fields;
            });

        return parsed;
    } // end parseKVP

    nameCPUStatKeys(statData)
    {
        return _.mapValues(statData, (val, key) => {
            if(/^cpu/.test(key))
            {
                return _.zipObject(cpuStatKeys, val);
            }
            else
            {
                return val;
            } // end if
        });
    } // end nameCPUStatKeys

    calcCPUPercentages(curCPUUsage)
    {
        curCPUUsage.totalTicks = _.sum([
            curCPUUsage.user,
            curCPUUsage.nice,
            curCPUUsage.system,
            curCPUUsage.idle,
            curCPUUsage.iowait,
            curCPUUsage.irq,
            curCPUUsage.softirq,
            curCPUUsage.steal,
            curCPUUsage.guest,
            curCPUUsage.guestNice,
        ]);

        curCPUUsage.percent = {
            total: (curCPUUsage.totalTicks - curCPUUsage.idle) / curCPUUsage.totalTicks,

            user: curCPUUsage.user / curCPUUsage.totalTicks,
            nice: curCPUUsage.nice / curCPUUsage.totalTicks,
            system: curCPUUsage.system / curCPUUsage.totalTicks,
            idle: curCPUUsage.idle / curCPUUsage.totalTicks,
            iowait: curCPUUsage.iowait / curCPUUsage.totalTicks,
            irq: curCPUUsage.irq / curCPUUsage.totalTicks,
            softirq: curCPUUsage.softirq / curCPUUsage.totalTicks,
            steal: curCPUUsage.steal / curCPUUsage.totalTicks,
            guest: curCPUUsage.guest / curCPUUsage.totalTicks,
            guestNice: curCPUUsage.guestNice / curCPUUsage.totalTicks,
        };
    } // end calcCPUPercentages
} // end ProcReader

function ins(obj)
{
    return util.inspect(obj, { colors: true })
        .replace(/\[[^]]+\]/g, (match) => {
            return match.replace(/,\n\s+/g, ', ');
        });
} // end ins

export default ProcReader;
