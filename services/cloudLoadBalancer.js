/**
 * Created by arik.blumin on 4/6/2016.
 */

var utils = require('./../utils.js');
var Q = require('q');
var globals = require('./../globals');
var logger = globals.logger;
var _ = require('lodash');
var constants = require('./../constants.js');
var D9 = constants.D9;

function logic(data) {

  var obj = {};
  obj.alldata = [];
  obj.groups = [];
  obj.loading = false;
  var SGRule = function (account, account_id, regionId, vpc, sgName, sgId, sgExternalId, protocol, port, scope, direction, tags) {
    this.account = account;
    this.account_id = account_id;
    this.regionId = regionId;
    this.region = D9.Constants.RegionName[this.regionId];
    this.vpc = vpc;
    this.sgName = sgName;
    this.sgId = sgId;
    this.xId = sgExternalId;
    this.protocol = protocol;
    this.port = (protocol === 'ICMP' && port === 256) ? 'All' : port;
    this.direction = direction;
    this.tags = tags;
    this.type = scope.type;

    switch (scope.type) {
      case "AWS":
        this.source = scope.data.extid;
        this.scopeDescription = scope.data.name;
        break;
      case "CIDR":
        this.source = scope.data.cidr;
        this.scopeDescription = scope.data.note;
        break;
      case "IPList":
      case "MagicIP":
        this.source = scope.data.name;
        this.scopeDescription = "";
        break;

    }

    this.atomic_rule_id = '';

    if (sgId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + sgId.toString() + '-';
    }
    if (protocol !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + protocol.toString() + '-';
    }
    if (port !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + port.toString() + '-';
    }
    if (this.source !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + this.source.toString() + '-';
    }

  };

  var AtomicRule = function (SGRule,
                             elbId,
                             name,
                             cloudAccountId,
                             tags) {
    this.account = SGRule.account;
    this.account_id = SGRule.account_id;
    this.regionId = SGRule.regionId;
    this.region = D9.Constants.RegionName[this.regionId];
    this.vpc = SGRule.vpc;
    this.sgName = SGRule.sgName;
    this.sgId = SGRule.sgId;
    this.xId = SGRule.xId;
    this.protocol = SGRule.protocol;
    this.port = SGRule.port;
    this.direction = SGRule.direction;
    this.SGtags = SGRule.tags;
    this.elbId = elbId;
    this.name = name;
    this.cloudAccountId = cloudAccountId;
    this.tags = tags;
    this.type = SGRule.type;
    this.source = SGRule.source;
    this.scopeDescription = SGRule.scopeDescription;
    this.atomic_rule_id = '';

    if (this.publicIpAddress === '') {
      this.hasPublicAddress = 'No';
    }
    else {
      this.hasPublicAddress = 'Yes';
    }

    if (elbId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + elbId.toString() + '-';
    }
    if (SGRule.sgId !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + SGRule.sgId.toString() + '-';
    }
    if (SGRule.protocol !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + SGRule.protocol.toString() + '-';
    }
    if (SGRule.port !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + SGRule.port.toString() + '-';
    }
    if (this.source !== undefined) {
      this.atomic_rule_id = this.atomic_rule_id + this.source.toString() + '-';
    }
  };



  obj.runReport = function () {
    obj.loading = true;
    obj.alldata = [];
    obj.indexdata = {};

    // need to do some magic....
    obj.sgalldata = _.flattenDeep(_.map(data.securityGroups, function (sg) {
      var inboundRules = _.map(sg.services.inbound, function (service) {
        return _.map(service.scope, function (scopeItem) {
          return new SGRule(
            sg.cloudAccountName,
            sg.cloudAccountId,
            sg.regionId,
            sg.vpcId,
            sg.securityGroupName,
            sg.securityGroupId,
            sg.externalId,
            service.protocolType,
            service.port,
            scopeItem,
            "Inbound", sg.tags);
        });
      });
      var outboundRules = _.map(sg.services.outbound, function (service) {
        return _.map(service.scope, function (scopeItem) {
          return new SGRule(
            sg.cloudAccountName,
            sg.cloudAccountId,
            sg.regionId,
            sg.vpcId,
            sg.securityGroupName,
            sg.securityGroupId,
            sg.externalId,
            service.protocolType,
            service.port,
            scopeItem,
            "Outbound", sg.tags);
        });
      });
      return inboundRules.concat(outboundRules);
    }));
    obj.elbsSGMap = {};
    _.each(obj.sgalldata, function (sgRule) {
      if (obj.elbsSGMap[sgRule.xId]) {
        obj.elbsSGMap[sgRule.xId].push(sgRule);
      }
      else {
        obj.elbsSGMap[sgRule.xId] = [];
        obj.elbsSGMap[sgRule.xId].push(sgRule);
      }
    });
    obj.listOfValues = {};
    obj.alldata = [];
    if (data.elbs) {
      _.each(data.elbs, function (elb) {
        _.each(elb.securityGroups, function (sgID) {
          var elbSGs = obj.elbsSGMap[sgID];
          _.each(elbSGs, function (sgRule) {
            var ruleToAdd = new AtomicRule(sgRule,
              elb.elbId,
              elb.name,
              elb.cloudAccountId,
              elb.tags);
            obj.alldata.push(ruleToAdd);
          });
        });
      });
    }


  };

  obj.fieldsToAutoCompleate = ["xId", "cloudAccountId", "type", "state", "source", "account", "account_id", "region", "vpc", "sgName", "sgId", "protocol", "port", "direction"];

  obj.runReport();


  return obj.alldata;
}

function get(id) {
  var url = "https://secure.dome9.com/api/CloudLoadBalancer";
  if (id) {
    url += '/' + id;
  }
  var requestOptions = {
    url: url,
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    json: true
  };

  return Q(this.connection.requestV2WebApi(requestOptions)).fail(function (reason) {
    throw 'cannot perform dome9/CloudLoadBalancer.get, reason:' + JSON.stringify(reason);
  });
}

function CloudLoadBalancer(dome9Connection) {
  this.connection = dome9Connection;
}

CloudLoadBalancer.prototype = {
  get: get,
  logic: logic
};

module.exports = function (dome9Connection) {
  return new CloudLoadBalancer(dome9Connection);
};
