	var LINFINITY = 	-1;
	var TRIANGLE  = 	0;
	var RINFINITY = 	1;
	var TRAPEZOID = 	2;
	var INPUT 	  = 	0;
	var OUTPUT 	  = 	1;


	var strpos =  function(haystack, needle, offset) {
		// Finds position of first occurrence of a string within another  
		// 
		// version: 1103.1210
		// discuss at: http://phpjs.org/functions/strpos
		// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: Onno Marsman    
		// +   bugfixed by: Daniel Esteban
		// +   improved by: Brett Zamir (http://brett-zamir.me)
		// *     example 1: strpos('Kevin van Zonneveld', 'e', 5);
		// *     returns 1: 14
		var i = (haystack + '').indexOf(needle, (offset || 0));
		return i === -1 ? false : i;
	}
	var IsNumeric = function (input) {
		return (input - 0) == input && input.length > 0;
	}
/* Member collection class
 * Store all members as objects in collection (array)
*/ 
	var MembersCollection = function() {
	this.members = [];
	}
/* Member collection prototype (methods)
 * methods : addItem, getLength, getItemAt, clearAll <- remote collection methods
 * fuzzify = function(member,point) 
 * method to calculate fuzzify value from crisp member value
 * if crisp value is in range member shape then calculate
 * fuzzy value in point data.
 * @params :
 * member object {begin:FA,middle:FMiddle,end:FB,member_type: eg TRIANGLE}
 * point : float (crisp) value
*/	
	MembersCollection.prototype = {
		addItem : function(item) {
			this.members.push(item);
		},
		getLength : function() {
			return this.members.length;
		},
		getItemAt : function(index) {
			return this.members[index];
		},
		clearAll : function() {
			this.members = [];
		},
		getItemByPath : function(path) {
			var paths = path.split(/[\.]/);
			var l = this.members.length;
			for(var i=0; i < l; i++) {
				if ((this.members[i].io_name == paths[0]) && (this.members[i].member == paths[1])) return this.members[i];
			}
			return (i!=l);
		},
		
		fuzzify : function(m,point) {
		$member = (typeof(m)=='object') ? m : this.members[''+m];
		if ((point<$member.FA) || (point>$member.FB)) return 0; //point is out $member segment...
		if (point==$member.FMiddle) return 1;
		if ($member.FType==LINFINITY) {
			if (point<=$member.FMiddle) return 1;
			if ((point>$member.FMiddle) && (point<$member.FB)) return ($member.FB - point)/($member.FB - $member.FMiddle);
		}
		if ($member.FType==RINFINITY) {
			if (point>=$member.FMiddle) return 1;
			if ((point<$member.FMiddle) && (point>$member.FA)) return (point-$member.FA)/($member.FMiddle-$member.FA);
		}
		if ($member.FType==TRIANGLE) {
		if((point<$member.FMiddle) && (point>$member.FA)) return (point-$member.FA)/($member.FMiddle-$member.FA);
		if((point>$member.FMiddle) && (point<$member.FB))  return ($member.FB-point)/($member.FB-$member.FMiddle);
		}
		if ($member.FType==TRAPEZOID) {
		if((point<$member.FMiddle[0]) && (point>$member.FA)) return (point-$member.FA)/($member.FMiddle[0]-$member.FA);
		if((point>$member.FMiddle[1]) && (point<$member.FB))  return ($member.FB-point)/($member.FB-$member.FMiddle[1]);
		if ((point>=$member.FMiddle) && (point<=$member.FMiddle))  return 1;
		}
		return 0;
		},

		fuzzifyInput : function(inputName,key,value) {
			var l = this.members.length;
			for(var i=0; i < l; i++) {
				var member = this.members[i];
				if ( member.io_name== inputName) {
				   member[''+key] = this.fuzzify(member,value);
				}
			}
		},		
	}; 
/* var AggregatePoints 
 * The size distribution required to calculate 
 * integrals for agregate output results
*/	
	var AgregatePoints =  100;
/* Core FuzzyLogic class constructor
 * create all data variables as objects or arrays. 
*/	
	var FuzzyLogic = function() {
		this.FMin	=	{};
		this.FMax	=	{};
		this.StateOutput = {};
		this.rules = [];
		this.FXValues 	= {};
		this.FYValues 	= {};
		this.FRealInput	= {};
		this.FOutputs	= {};
		this.InputNames = [];
		this.OutputNames = [];
		this.mc = new MembersCollection();
	}	
/* Core FuzzyLogic class prototype (methods) */	
	FuzzyLogic.prototype = {
/* addMember method 
* add member to members collection
* and set min and max for members set input and output
* @params
* io_name: (string) input/output name
* name   : (string) member name
* left   : (float)  left shape point
* middle : (float)  middle shape point or array of point for TRAPEZOID
* right  : (float)  right shape point
* type   : (integer) shape type member constant : 
* LINFINITY OR TRIANGLE OR RINFINITY OR TRAPEZOID
*/	
		addMember : function (io_name,name,left,middle,right,type) {
			var o = {};
			o.io_name = io_name;
			o.member = name;
			o.FA = left;
			o.FMiddle = middle;
			o.FB = right;
			o.FType = type;
			if (typeof(this.FMin[''+io_name]) !=='undefined') {
			if (parseFloat(o.FA) <= parseFloat(this.FMin[''+io_name])) this.FMin[''+io_name]=parseFloat(o.FA);
			if (parseFloat(o.FB) >= parseFloat(this.FMax[''+io_name])) this.FMax[''+io_name]=parseFloat(o.FB);
				}
			this.mc.addItem(o);
		},
/* method : clearSolutions (output) objects
 * for use class again
*/		
		clearSolutions : function() {
			this.FXValues			=	{} ;
			this.FYValues			=	{} ;
		},	
/* method : clearMembers (array in members collection) */				
		clearMembers : function () {
		this.members = [];
		},
/* method : getMemberByPath  
@ return member object
@ parameter : path (dot separated : 'io_name.member_name')
*/		
		getMemberByPath : function(path) {
			return this.mc.getItemByPath(path);
		},
/* method : setInputNames  
* store Input Names
* @ parameter : array of string eg : ['io_name1','io_name2']
*/		
		setInputNames : function(val) {
		this.InputNames = val;
		},
/* method : setOutputNames  
* store Output Names
* @ parameter : array of string eg : ['io_name1','io_name2']
*/			
		setOutputNames : function(val) {
		this.OutputNames = val;
		for (var i=0;i<this.OutputNames.length;i++) {
			this.FMin[''+this.OutputNames[i]] = 9E10;
			this.FMax[''+this.OutputNames[i]] = -9E10;
		   }
		},
/* method rSplit
*  return last nested parenthed (fragment)
*  for use internal rules command line interpreter
*/		
		rSplit : function (str) {
			return str.match(/\([^\(\)]*\)/);		
		},
/* method _FuzzyOR
*  return fuzzy OR value as max value from array of fuzzy operands
*/				
		_FuzzyOR : function(arr) {
			return parseFloat(Math.max.apply( Math, arr ));
			//return (arr.max);
		},
/* method _FuzzyAND
*  return fuzzy AND value as min value from array of fuzzy operands
*/		
		_FuzzyAND : function(arr) {
			 return parseFloat(Math.min.apply( Math, arr ));
			//return (arr.min);
		}, 
/* method _FuzzyNOT
*  return fuzzy NOT value as 1-operand VALUE passed as array[0].
*/			
		_FuzzyNOT : function(arr) {
			return parseFloat((1 - arr[0]));
		}, 
/* method addRule
*  add rule to rules collection (array of rules as string)
*  parameter string (rule as text line eg 'IF input1.member1 AND input2.member2 THEN out1.member3') 
*/					
		addRule	: function(rule) {
			this.rules.push(rule);
		},
/* method clearRules
*  clear all rules from rules collection
*/					
		clearRules : function () {
			this.rules=[];
		},
/* method getFuzzyResult
*  return switched by operator 
*  fuzzy logic operation for parameter in array
*/							
		getFuzzyResult : function(op,arr) {
		 switch (op) {
		 case "or" : return this._FuzzyOR(arr);
			break;
		 case "not" : return this._FuzzyNOT(arr);
			break;
		 default : return this._FuzzyAND(arr);
		 }
		},
/* method processRule
*  rule command line interpreter
*/							
		processRule : function(rule) {
		var in_parent ='';
			while (in_parent = this.rSplit(rule)) {	
				var pos=strpos(rule,in_parent);
				var len=(''+in_parent).length;
				var tmparr=[];
				var items=in_parent.split(/\s+/);
				var operation='and';
				for(var idx=0;idx<items.length;idx++) {
					var item = items[idx];
					inp=item.toLowerCase();
					if ((inp=='or') || (inp=='and') || (inp=='not')) var operation=inp; 	else   {
						var mcx = this.getMemberByPath(item);
						tmparr.push(mcx.FuzzifyValue);
					}
				}
			var value1 = this.getFuzzyResult(operation,tmparr);
			rule=rule.substr(0,pos) + value1 + rule.substr(pos+len); 
			}
			var tmparr=[];
			var items=rule.split(/\s+/);
			var outitem = items.pop();
			var operation='and';
			for(var idx=0;idx<items.length;idx++) {
				var item = items[idx];
				inp=item.toLowerCase();
				if ((inp=='if') || (inp=='then')) continue;
				if ((inp=='or') || (inp=='and') || (inp=='not')) var operation=inp; 	else   {
					var mcx = this.getMemberByPath(item);
					tmparr.push(mcx.FuzzifyValue);
					}
			}
			var value1 = this.getFuzzyResult(operation,tmparr);	  
				
		return [outitem,value1];
		},
/* method setRealInput
*  set input values for members input
* @ parameters
* inputName  (string) as neme of input
* inputValue (float) input value
*/									
		setRealInput : function(inputName,inputValue) {
			this.FRealInput[''+inputName]	=	parseFloat(inputValue);
			this.mc.fuzzifyInput(inputName,'FuzzifyValue',inputValue);
		},
		fuzzyAgregate : function(outname,Member,AlphaCut) {
			for(var index=0; index<this.FXValues[''+outname].length;index++) {
				var pointX = this.FXValues[''+outname][index];
				if (pointX<Member.FA) continue;
				if (pointX>Member.FB) break;
				var ms = this.mc.fuzzify(Member,pointX);
				var mem_val = Math.min(parseFloat(ms),parseFloat(AlphaCut));
				this.FYValues[''+outname][index] = Math.max(parseFloat(this.FYValues[''+outname][index]),parseFloat(mem_val));	
			}
		},
/* method calcFuzzy
*  main loop fuzzy logic procedure
*  algorythm :
*  initial clearSolutions data
*  create out arrays for agregate results
*  pass all rules and agregate outputs result
*  deffuzify agregate outputs result
*  return crisp output values as object key : value
*  where key (string) as output name, value = crisp output value
*/			
		calcFuzzy : function() {	
			this.clearSolutions();		
			var sum = 0;
			var tmpx=[];
			var sum =[];
			var cnt =[];
			// fill output agregate table
			for(var idx=0;idx<this.OutputNames.length;idx++)  {
			var outname = ''+this.OutputNames[idx];
			var AgregateDeltaX = (this.FMax[''+outname]-this.FMin[''+outname])/AgregatePoints;
			var a = [];
			var b = [];
			a[0]=this.FMin[''+outname];
			b[0]= 0.0;
			for (var i=1;i<AgregatePoints;i++) {
				a[i] = a[i-1]+AgregateDeltaX;
				b[i] = 0.0;
				}
			a[AgregatePoints]=this.FMax[''+outname];
			b[AgregatePoints]=0.0;
			
			this.FXValues[''+outname] = a;
			this.FYValues[''+outname] = b;			
			}

			for (var i=0;i<this.rules.length;i++) {
				var rule = this.rules[i];
				var complexRule =  this.processRule(rule);
				var outItem = complexRule[0];
				var value = complexRule[1];
				var complexOut =outItem.split(/\./);
				outputName = complexOut[0];
				memberName = complexOut[1]; 
				this.StateOutput[''+memberName] = value;
				member=this.getMemberByPath(outItem); // get OUTPUT member
				if (value>0)  this.fuzzyAgregate(outputName,member,value);
				}
		
			var result = {};
			
			for (var i=0;i<this.OutputNames.length;i++) {
			suma=0.0;
			sumb=0.0;
			var outname = ''+this.OutputNames[i];
			for (var id=0;id<this.FXValues[''+outname].length;id++) {
				x=parseFloat(this.FXValues[''+outname][id]);
				y=parseFloat(this.FYValues[''+outname][id]);
				if (y>0) {
				suma+=(x*y);
				sumb+=y;
				}
			}	
			if (sumb == 0) result[''+outname]= 0; else	result[''+outname] = suma/sumb;	
			}
			return result;
		},
		
	};	// end of FuzzyLogic.prototype