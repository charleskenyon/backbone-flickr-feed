var Image = Backbone.Model.extend();

var Images = Backbone.Collection.extend({
	
	model: Image,
	
	url: "https://api.flickr.com/services/feeds/photos_public.gne?tags=potato&tagmode=all&format=json",
	
	sync : function(method, collection, options) {
		options.dataType = "jsonp";
		options.jsonpCallback = 'jsonFlickrFeed';
		options.cache = 'true';
		return Backbone.sync(method, collection, options);
	},
	
	parse: function(response) {
		return response.items;
    },
	
	slugify: function(text) {
		return text.toString().toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\w\-]+/g, '')
			.replace(/\-\-+/g, '-')
			.replace(/^-+/, '')
			.replace(/-+$/, '');
	},
	
	slugifyTitle: function() {
		var that = this;
		this.forEach(function(model){
			model.set({"slug": that.slugify(model.attributes.title)});
		}); 
		
		return this;
	},
	
	cutDescription: function() {
		this.forEach(function(model){
			var description = model.get('description');
			model.set({"description": description.split('<\/p>')[2] + '<\/p>'});
			console.log(model.get('description'));
		});
		
		return this;
	},
	
	createTagsHTML: function() {
		this.forEach(function(model){
			var tags = model.get('tags').split(' ');
			var newTags = $('<p></p>').attr({'class': 'tags-inline tags1'}).text('Tags:')[0].outerHTML;
			
			$.each(tags, function(index, value){
				newTags += $('<p></p>').attr({"data-url": value, 'class': 'tags-inline tags2'}).text(value)[0].outerHTML;
			});
			
			model.set({"tagsHTML": newTags});
		});
		
		return this;
	},
	
	cutUsername: function() {
		this.forEach(function(model){
			var regExp = /\(([^)]+)\)/;
			model.set({"username": regExp.exec(model.attributes.author)[1]});
		});
		
		return this;
	}
});

var ImageView = Backbone.View.extend({

	attributes: {
		class: "row"
	},
	
	events: {
		"click h3,img": "onClick"
	},
	
	render: function(){
		var template = $("#imageTemplate").html();
		var html = Mustache.render(template, this.model.toJSON());
		this.$el.html(html);
		
		return this;
	},
	
	onClick: function(e){
		var $image = $(e.target);
		router.navigate("images/" + $image.attr("data-url"), {trigger: true});
	}
});

var ImagesView = Backbone.View.extend({
	
	el: "#scroll",
	
	initialize: function() {
		this.render();
	},
	
	render: function(){
		this.$el.html("");
		var self = this;
		
		this.model.each(function(image){
			var imageView = new ImageView({model: image});
			self.$el.append(imageView.render().$el);
		});
	}
});

var SingleImageView = Backbone.View.extend({
	
	el: "#scroll",
	
	events: {
		"click .tags2": "onClick"
	},
	
	render: function(){
		var template = $("#singleImageTemplate").html();
		var html = Mustache.render(template, this.model.toJSON());
		this.$el.html(html);
		
		return this;
	},
	
	onClick: function(e){
		var $search = $(e.target);
		router.navigate('search/' + $search.attr("data-url"), {trigger: true});
	}
});

var AppRouter = Backbone.Router.extend({
	
	routes: {
		"": "homepage",
		"images/:image": "viewImagePage",
		"search/:query": "searchImagesPage"
	},
	
	homepage: function(){
		var imagesView = new ImagesView({model: images});
	},
	
	viewImagePage: function(image){
		var findModel = images.where({slug:image});
		var singleImageView = new SingleImageView({model: findModel[0]});
		singleImageView.render();
		gapi.plusone.render("plusone-div");
	},
	
	searchImagesPage: function(query){
		var combinedSearch = new Backbone.Collection();
		var queries = query.split(' ');
		
		$.each(queries, function(index, value){
			var searchImages = new Backbone.Collection(images.filter(function(model){
				return model.get('tags').indexOf(value) != -1;
			}));
			
			searchImages.forEach(function(model){
				if (!combinedSearch.contains(model)){
					combinedSearch.add(model);
				};
			});
		});
		
		var imagesView = new ImagesView({model: combinedSearch});
	}
});

var images = new Images();
var router = new AppRouter();

images.fetch({
	success: function(data){
		images.slugifyTitle().cutDescription().createTagsHTML().cutUsername();
		Backbone.history.start({pushState: true, root: window.location.pathname});
	}
});

$('.btn').on('click', function() {
	router.navigate('search/' + $('.form-control').val(), {trigger: true});
	$('.form-control').val('');
});